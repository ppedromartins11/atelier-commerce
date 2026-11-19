# Atelier Commerce — plataforma própria

## Objetivo

Plataforma de e-commerce brasileira reutilizável, sem dependência da Shopify. A primeira entrega contém site público, autenticação de administração, catálogo e variantes, movimentações de estoque registradas, telas administrativas de pedidos e notas fiscais e modelo de dados multi-loja.

## Módulos

| Módulo | Estado |
|---|---|
| Catálogo público e busca | Implementado (dados reais após banco) |
| Administração e autenticação | Implementado (Supabase Auth + RLS; requer provisionamento) |
| Produtos, categorias, variações e SKU | Cadastro inicial; evolução de grade complexa pendente |
| Estoque | Ajuste atômico + registro de histórico |
| Carrinho | Persistência local; sem pedido confirmado |
| Pedidos | Estrutura e leitura administrativa; criação por checkout pendente |
| Pagamentos | Schema; integração e webhook pendentes |
| Frete | Schema; cotação e transportadoras pendentes |
| Emissão de NF-e / NFC-e | Schema; autorização fiscal real pendente |
| Clientes / LGPD | Não iniciado; requer políticas de dados e consentimento |
| Multi-loja | Isolamento por store_id, permissões por membro; painel único por STORE_SLUG |

## Segurança

- Permissões por loja na Row Level Security. O usuário autenticado não se torna administrador automaticamente.
- Colunas comerciais sensíveis e pedidos somente são legíveis para usuários administradores da loja.
- Não há escrita pública de pedido, pagamento, estoque ou notas fiscais.
- Estoque tem restrições e movimentações atômicas; nunca confiar no preço armazenado no carrinho.
- Integrações fiscais precisam de CNPJ/IE, regime tributário, certificado e provedor homologado. Guardar credenciais e certificados apenas em serviços secretos, nunca em variáveis NEXT_PUBLIC, commits ou tabelas expostas.
- Pagamento exige verificação criptográfica de webhook, reconciliação e idempotência por pedido; confirmação nunca deve depender apenas do navegador.

## Ativação

1. Criar um projeto Supabase **dedicado** a este sistema.
2. Aplicar a migração SQL em um ambiente controlado e executar os advisors de segurança.
3. Criar usuário administrador no Supabase Auth; associá-lo a uma loja pelo SQL abaixo com UUID explícito obtido no painel.
4. Configurar NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e STORE_SLUG na hospedagem.
5. Validar o fluxo cadastro → estoque → publicação → vitrine antes de iniciar meios de pagamento.

Exemplo de provisionamento (substitua o UUID; execute com um administrador do banco, **nunca no navegador**):

```sql
insert into public.stores (slug,name,hero_title,is_published) values ('atelier','Atelier Commerce','Uma nova coleção está chegando',true);
insert into public.store_members (store_id,user_id,role)
select id, 'UUID_DO_USUARIO_AUTH'::uuid, 'owner' from public.stores where slug='atelier';
```

## Separação do projeto

A pasta original do tema Shopify foi preservada. O frontend estático continua em preview/. A nova plataforma é independente em platform/ e terá hospedagem própria; não redirecione o domínio comercial até homologação.
