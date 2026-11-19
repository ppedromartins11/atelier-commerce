-- Sprint 2: isolamento de lojistas e onboarding multi-loja.
-- Depende de 20261119180000_init_commerce.sql.
-- Não concede INSERT de pedidos/pagamentos/fiscal ao navegador.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

alter table public.stores
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

create index if not exists stores_owner_idx on public.stores(owner_user_id);

create or replace function app_private.is_store_owner(p_store_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
 select exists (
   select 1 from public.stores
   where id = p_store_id and owner_user_id = (select auth.uid())
 )
$$;
revoke all on function app_private.is_store_owner(uuid) from public;
grant execute on function app_private.is_store_owner(uuid) to authenticated;

-- Só o proprietário pode publicar / alterar o cadastro da sua loja.
create or replace function app_private.freeze_store_owner()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
 if new.owner_user_id is distinct from old.owner_user_id then
   raise exception 'Não é permitido transferir o proprietário diretamente';
 end if;
 return new;
end
$$;
revoke all on function app_private.freeze_store_owner() from public;
create trigger prevent_store_owner_change
before update on public.stores
for each row execute function app_private.freeze_store_owner();

create table if not exists public.store_invitations (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 email text not null check(email = lower(trim(email)) and length(email) between 6 and 254),
 role text not null default 'admin' check(role = 'admin'),
 invited_by uuid not null references auth.users(id),
 expires_at timestamptz not null default (now() + interval '7 days'),
 accepted_at timestamptz,
 created_at timestamptz not null default now(),
 unique(store_id,email)
);
create index if not exists store_invitations_email_idx on public.store_invitations(email);
alter table public.store_invitations enable row level security;
create policy "invitations_owner_read" on public.store_invitations
 for select to authenticated
 using ((select app_private.is_store_owner(store_id)));
create policy "invitations_recipient_read" on public.store_invitations
 for select to authenticated
 using (email = lower(coalesce((select auth.jwt())->>'email','')));
create policy "invitations_owner_insert" on public.store_invitations
 for insert to authenticated
 with check (
   (select app_private.is_store_owner(store_id))
   and invited_by = (select auth.uid())
   and role = 'admin'
   and accepted_at is null
   and expires_at > now()
   and expires_at <= now() + interval '8 days'
 );
-- Um convidado pode ler o nome da loja associada ao seu convite,
-- sem ler catálogos privados ou os dados administrativos da empresa.
create policy "stores_invitee_read" on public.stores
 for select to authenticated using (
   exists (
     select 1 from public.store_invitations i
     where i.store_id = public.stores.id and i.accepted_at is null
       and i.expires_at > now()
       and i.email = lower(coalesce((select auth.jwt())->>'email',''))
   )
 );
create policy "invitations_owner_delete" on public.store_invitations
 for delete to authenticated
 using ((select app_private.is_store_owner(store_id)) and accepted_at is null);

-- A criação de uma loja é feita pelo próprio dono autenticado.
-- Proíbe publicar a loja sem passar posteriormente pelo painel.
create policy "stores_register_own" on public.stores
 for insert to authenticated
 with check (
   owner_user_id = (select auth.uid())
   and owner_user_id is not null
   and is_published = false
 );
-- A consulta do dono não precisa ser pública quando a loja ainda é um rascunho.
create policy "stores_owner_read" on public.stores
 for select to authenticated
 using (owner_user_id = (select auth.uid()));

-- A função de trigger não fica exposta no schema public / Data API.
-- Um convite só pode ser aceito pelo proprietário de um e-mail verificado.
create or replace function app_private.verify_store_membership()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
 v_owner uuid;
 v_email text;
 v_invite_id uuid;
begin
 select owner_user_id into v_owner from public.stores where id=new.store_id;
 if not found then raise exception 'Loja inexistente'; end if;
 if new.role = 'owner' then
   if new.user_id is distinct from v_owner then
     raise exception 'Somente o proprietário pode ter o papel de proprietário';
   end if;
   return new;
 end if;
 if new.role <> 'admin' then
   raise exception 'Papel não autorizado';
 end if;

 select lower(email) into v_email
 from auth.users where id = new.user_id and email_confirmed_at is not null;
 if v_email is null then
   raise exception 'Confirme seu e-mail antes de aceitar convites';
 end if;

 select id into v_invite_id
 from public.store_invitations
 where store_id = new.store_id and email = v_email and role = new.role
   and accepted_at is null and expires_at > now()
 for update;
 if v_invite_id is null then
   raise exception 'Convite inexistente, expirado ou já utilizado';
 end if;
 return new;
end
$$;
revoke all on function app_private.verify_store_membership() from public;
-- AFTER INSERT é obrigatório: políticas WITH CHECK são avaliadas após o BEFORE trigger.
create or replace function app_private.mark_invite_accepted()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
 if new.role = 'admin' then
   update public.store_invitations
   set accepted_at = now()
   where store_id = new.store_id and role = new.role
     and email = (select lower(email) from auth.users where id = new.user_id)
     and accepted_at is null;
 end if;
 return new;
end
$$;
revoke all on function app_private.mark_invite_accepted() from public;
create trigger mark_invitation_after_join
after insert on public.store_members
for each row execute function app_private.mark_invite_accepted();
create trigger check_store_membership_before_insert
before insert on public.store_members
for each row execute function app_private.verify_store_membership();

create or replace function app_private.on_store_created()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
 if new.owner_user_id is null then
   raise exception 'Proprietário obrigatório para criar uma loja';
 end if;
 insert into public.store_members (store_id,user_id,role)
 values(new.id,new.owner_user_id,'owner');
 return new;
end
$$;
revoke all on function app_private.on_store_created() from public;
create trigger grant_owner_on_store_create
after insert on public.stores
for each row execute function app_private.on_store_created();

-- Políticas de membro: lista individual ou do dono.
create policy "members_select_as_owner" on public.store_members
 for select to authenticated
 using ((select app_private.is_store_owner(store_id)));
create policy "members_join_with_invite" on public.store_members
 for insert to authenticated
 with check (
   user_id = (select auth.uid())
   and role = 'admin'
   and exists (
     select 1 from public.store_invitations i
     where i.store_id=public.store_members.store_id
       and i.email=lower(coalesce((select auth.jwt())->>'email',''))
       and i.role=public.store_members.role
       and i.accepted_at is null
       and i.expires_at > now()
   )
 );
create policy "members_owner_remove_admin" on public.store_members
 for delete to authenticated
 using ((select app_private.is_store_owner(store_id)) and role = 'admin');

-- Os domínios são somente propostas, até o sistema verificar DNS.
-- O cliente não pode marcar um domínio como validado diretamente.
create table if not exists public.store_domains (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 hostname text not null unique check(hostname = lower(trim(hostname))),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.store_domains enable row level security;
create policy "domains_owner_select" on public.store_domains
 for select to authenticated using ((select app_private.is_store_owner(store_id)));
create policy "domains_owner_propose" on public.store_domains
 for insert to authenticated with check (
   (select app_private.is_store_owner(store_id)) and verified_at is null
 );
create policy "domains_owner_delete_pending" on public.store_domains
 for delete to authenticated using (
   (select app_private.is_store_owner(store_id)) and verified_at is null
 );

-- Proteção explícita da Data API. RLS segue controlando quais linhas aparecem.
grant select, insert, update on public.stores to authenticated;
grant select on public.stores to anon;
grant select, insert, delete on public.store_members to authenticated;
grant select, insert, delete on public.store_invitations to authenticated;
grant select, insert, delete on public.store_domains to authenticated;
