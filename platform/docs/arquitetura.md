# Arquitetura da plataforma

## Aplicação

`app/(store)/` é a vitrine padrão, resolvida por `STORE_SLUG`. `app/loja/[tenant]/` resolve a loja pelo slug da URL. As duas usam componentes de `components/` e consultas de `lib/catalog.ts`; a loja precisa estar publicada para aparecer ao público. `app/admin/` contém o painel e as Server Actions. `lib/supabase.ts` cria o cliente público e o cliente de sessão, consulta o usuário com `auth.getUser()` e escolhe a loja ativa entre as associações reais desse usuário. O cookie de seleção é apenas preferência.

O painel usa `store_id` em cada consulta e operação. As tabelas operacionais têm `store_id`, chaves estrangeiras compostas quando relacionam dados de loja e políticas RLS. A autorização final precisa ocorrer no banco: parâmetros de URL, formulários e cookies não são fontes de permissão. As migrações ficam em `supabase/migrations/` e são aplicadas em ordem; as duas iniciais permanecem como histórico.

## Permissões atuais

Um usuário pode pertencer a mais de uma loja. `owner` administra a identidade, publicação, equipe e solicitações de domínio; `admin` pode gerenciar catálogo e estoque. A migração mais recente remove a política antiga que permitia ao `admin` alterar a própria loja. O cadastro inicial de produto e o ajuste de estoque passam por funções em `app_private` com checagem de associação à loja, chamadas por RPCs públicas restritas a `authenticated`. Produtos, variantes e movimentações iniciais são gravados na mesma transação. A Data API não recebe escrita direta nessas tabelas sensíveis após a nova migração.

Convites são registros no banco, sem envio automático. A aceitação exige e-mail confirmado e é conferida por trigger. Domínios são propostas pendentes; a tabela não oferece atualização pública de `verified_at`. Não há políticas públicas para criar pedidos, registrar pagamentos ou emitir documentos fiscais.

## Limites e homologação obrigatória

As políticas e funções foram revisadas no código, mas **não foram aplicadas nem executadas em um banco dedicado nesta auditoria**. Antes de cadastrar empresas reais, é obrigatório aplicar as migrações em ambiente isolado, rodar os advisors, confirmar grants e exercitar consultas e mutações com dois usuários de lojas diferentes. O teste deve trocar `store_id`, cookie, slug e identificadores nas RPCs; todas as tentativas de leitura ou escrita cruzada devem ser negadas. Teste também proprietário versus administrador, convite expirado, revogação, criação parcial de produto e concorrência no estoque.

`orders`, `payments`, `fiscal_documents` e `shipping_methods` são apenas estruturas para evolução. O carrinho fica no armazenamento local do navegador e não é cotação, reserva ou pedido. A confirmação de pagamento dependerá de provedor real, webhook autenticado, idempotência e reconciliação. A operação fiscal dependerá de integração e homologação próprias.

O [README principal](../../README.md) contém instalação, variáveis, testes e publicação. O [roadmap](sprints.md) registra a ordem de evolução.
