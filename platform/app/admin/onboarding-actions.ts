'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {memberStores,requireAdmin,selectStoreCookie,sessionClient} from '@/lib/supabase';
import {slugify} from '@/lib/format';
function field(data:FormData,key:string){return String(data.get(key)||'').trim();}
function problem(destination:string,message:string):never{
  redirect(destination+'?erro='+encodeURIComponent(message));
}
const banned=new Set(['admin','api','auth','loja','checkout','login','www','suporte','ajuda','catalogo']);

export async function registerAccount(data:FormData){
  const db=await sessionClient();
  if(!db)problem('/admin/cadastro','Banco de dados ainda não configurado.');
  const email=field(data,'email').toLowerCase();
  const password=field(data,'password');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)problem('/admin/cadastro','Informe um e-mail válido.');
  if(password.length<12||password.length>72)problem('/admin/cadastro','Use uma senha entre 12 e 72 caracteres.');
  const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://atelier-commerce-platform.vercel.app').replace(/\/$/,'');
  const {data:result,error}=await db.auth.signUp({
    email,password,
    options:{emailRedirectTo:origin+'/auth/confirm'}
  });
  if(error)problem('/admin/cadastro','Não foi possível criar a conta. Verifique os dados e tente novamente.');
  if(result.session)redirect('/admin/lojas');
  redirect('/admin/cadastro?status=confirmar');
}

export async function registerStore(data:FormData){
  const db=await sessionClient();
  if(!db)problem('/admin/lojas/nova','Banco ainda não habilitado.');
  const {data:auth,error:authError}=await db.auth.getUser();
  if(authError||!auth.user)redirect('/admin/login');
  if(!auth.user.email_confirmed_at)problem('/admin/lojas/nova','Confirme seu e-mail antes de criar a loja.');
  const name=field(data,'name').slice(0,120);
  const slug=slugify(field(data,'slug')||name).slice(0,60);
  if(name.length<3||slug.length<3||banned.has(slug)||!/^[a-z0-9-]{3,60}$/.test(slug))problem('/admin/lojas/nova','Escolha um nome e endereço válidos.');
  const {data:shop,error}=await db.from('stores').insert({
    name,slug,owner_user_id:auth.user.id,is_published:false
  }).select('id').single();
  if(error||!shop)problem('/admin/lojas/nova','Não foi possível cadastrar a loja. Verifique se o endereço já está em uso e se o banco foi migrado.');
  await selectStoreCookie(shop.id);
  revalidatePath('/admin/lojas');
  redirect('/admin');
}

export async function changeActiveStore(data:FormData){
  const context=await memberStores();
  if(!context)redirect('/admin/login');
  const id=field(data,'store_id');
  const selected=context.shops.find(s=>s.id===id);
  if(!selected)problem('/admin/lojas','Você não tem acesso a essa loja.');
  await selectStoreCookie(selected.id);
  revalidatePath('/admin');
  redirect('/admin');
}

export async function inviteStoreAdmin(data:FormData){
  const context=await requireAdmin();
  if(!context)redirect('/admin/login');
  if(context.role!=='owner')problem('/admin/equipe','Somente o proprietário pode convidar administradores.');
  const email=field(data,'email').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)problem('/admin/equipe','Informe um e-mail válido.');
  if(email===context.user.email?.toLowerCase())problem('/admin/equipe','Você já é o proprietário da loja.');
  const {error}=await context.db.from('store_invitations').insert({
    store_id:context.shop.id,email,role:'admin',invited_by:context.user.id
  });
  if(error)problem('/admin/equipe','Não foi possível registrar o convite. Verifique se já existe um convite para esse e-mail.');
  revalidatePath('/admin/equipe');
  redirect('/admin/equipe?enviado=1');
}

export async function cancelInvite(data:FormData){
  const context=await requireAdmin();
  if(!context||context.role!=='owner')redirect('/admin/login');
  const id=field(data,'invite_id');
  const {error}=await context.db.from('store_invitations').delete().eq('id',id)
    .eq('store_id',context.shop.id).is('accepted_at',null);
  if(error)problem('/admin/equipe','Não foi possível cancelar o convite.');
  revalidatePath('/admin/equipe');
  redirect('/admin/equipe');
}

export async function acceptInvite(data:FormData){
  const db=await sessionClient();
  if(!db)redirect('/admin/login');
  const {data:auth}=await db.auth.getUser();
  if(!auth.user)redirect('/admin/login');
  if(!auth.user.email_confirmed_at)problem('/admin/convites','Confirme seu e-mail primeiro.');
  const id=field(data,'invite_id');
  const {data:invite,error}=await db.from('store_invitations')
    .select('store_id,email,role,expires_at,accepted_at').eq('id',id).single();
  if(error||!invite||invite.accepted_at||new Date(invite.expires_at).getTime()<=Date.now()
    ||invite.email.toLowerCase()!==auth.user.email?.toLowerCase())
    problem('/admin/convites','Convite inválido ou expirado.');
  const {error:joinError}=await db.from('store_members').insert({
    store_id:invite.store_id,user_id:auth.user.id,role:invite.role
  });
  if(joinError)problem('/admin/convites','Não foi possível aceitar o convite. Verifique sua conta.');
  await selectStoreCookie(invite.store_id);
  revalidatePath('/admin/lojas');
  redirect('/admin');
}

export async function removeTeamMember(data:FormData){
  const context=await requireAdmin();
  if(!context||context.role!=='owner')redirect('/admin/login');
  const userId=field(data,'user_id');
  if(userId===context.user.id)problem('/admin/equipe','O proprietário não pode remover a si mesmo.');
  const {error}=await context.db.from('store_members').delete()
    .eq('store_id',context.shop.id).eq('user_id',userId).eq('role','admin');
  if(error)problem('/admin/equipe','Não foi possível remover este usuário.');
  revalidatePath('/admin/equipe');
  redirect('/admin/equipe');
}

export async function changeStoreVisibility(data:FormData){
  const context=await requireAdmin();
  if(!context||context.role!=='owner')redirect('/admin/login');
  const enabled=field(data,'visible')==='true';
  const {error}=await context.db.from('stores').update({is_published:enabled}).eq('id',context.shop.id);
  if(error)problem('/admin/lojas','Falha ao atualizar visibilidade da loja.');
  revalidatePath('/admin/lojas');
  revalidatePath('/loja/'+context.shop.slug);
  redirect('/admin/lojas');
}
