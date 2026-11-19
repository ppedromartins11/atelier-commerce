# Sprint 3.2 — RLS e isolamento do catálogo (19/11/2026)

## Escopo executado
Banco de desenvolvimento dedicado: projeto Supabase `atelier-commerce` (ref `pnfixgdfnzphrygtfmsd`). A branch de trabalho é `sprint-3-supabase-hardening`; não publicar na produção antes da homologação.

### Defeito confirmado e corrigido
A consulta `SELECT` como papel `anon` falhava com `permission denied for table store_members`: políticas `stores_visible`, `categories_read`, `products_read` e `variants_read` invocavam `public.is_store_admin(...)`, função `SECURITY INVOKER`, mesmo na leitura pública. O papel `anon` não deve ter acesso à tabela de membros.

A migração `20261119234814_separate_public_storefront_rls.sql` desmembra as políticas `SELECT` em:
- público: `anon,authenticated` somente quando loja/produto estiver publicado (e variante ativa);
- administrativo: `authenticated` e vínculo verificado com a loja.

As políticas de escrita, convites, proprietário e outras operações permanecem inalteradas.

### Cenários executados no banco
- Proprietário autenticado (identidade simulada via claims Postgres) consegue consultar sua loja privada.
- Identidade autenticada sem vínculo vê zero lojas privadas, produtos e associações; tentativa de UPDATE não alterou registros.
- Visitante anônimo não recebe dados privados e consegue consultar lojas, categorias, produtos e variantes sem erro de permissão.
- Loja temporariamente publicada dentro de transação fica visível ao papel anon.
- RPC de criação gerou 1 produto + 1 variante + 1 movimento inicial de estoque na mesma transação.
- RPC de ajuste elevou estoque de 7 para 10 e registrou o segundo movimento.
- Escrita direta na coluna de saldo da tabela product_variants não é concedida a authenticated.
- Chamada de criação de produto por identidade sem vínculo recebeu `Acesso negado`.
- As alterações de teste foram revertidas com `ROLLBACK`; a loja real continua não publicada e sem produtos.

Reprodução: executar **o arquivo inteiro** `platform/tests/rls-smoke.sql` no SQL Editor do projeto de **desenvolvimento**, com papel de administrador; não executar trechos isolados. O teste requer uma loja privada já cadastrada. Não executar em produção. 
O teste usa troca controlada de papéis PostgreSQL e simulação de `auth.uid()`; **não equivale** a duas sessões reais de Supabase Auth.

## Migrações remotas
A aplicação remota mantém cinco migrações:
1. `20261119231706` — init_commerce
2. `20261119231712` — multi_tenant_onboarding
3. `20261119231718` — secure_store_updates_and_atomic_product_creation
4. `20261119231753` — restrict_api_table_privileges
5. `20261119234814` — separate_public_storefront_rls

**Pendente:** os nomes/versões dos primeiros três arquivos históricos do GitHub diferem das versões gravadas pelo conector no histórico remoto. Antes de `supabase db push`, `db pull` ou CI automatizado de migrações, fazer a reconciliação controlada do histórico; não executar migrações antigas novamente e não apagar tabelas.

## Limitações e bloqueios
- Apenas uma conta Auth e uma loja reais. Falta o teste de ponta a ponta com duas contas Supabase Auth, duas lojas, convites, revogação, troca de tenant por cookie, publicação e concorrência.
- O Security Advisor agora registra `auth_leaked_password_protection` (proteção contra senhas vazadas desativada). Configuração de Auth deverá ser revisada no painel Supabase, respeitando limites do plano.
- Performance Advisor informou índices ausentes em FKs e políticas permissivas múltiplas; revisar com tráfego e cardinalidade antes de adicionar ou remover índices.
- Testes Next.js, build e responsividade não foram reexecutados nesta etapa. Sem deploy de produção.

Próximo passo: homologação com 2 usuários reais e desenvolvimento do CRUD completo de catálogo e imagens com Storage, seguido de E2E.
