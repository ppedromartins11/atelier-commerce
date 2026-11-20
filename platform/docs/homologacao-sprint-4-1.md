# Homologação 4.1 — Atelier Commerce

**Resultado: PARCIALMENTE APROVADO para desenvolvimento. NÃO HOMOLOGADO para operação comercial.**

Ambiente: Supabase de desenvolvimento dedicado `pnfixgdfnzphrygtfmsd`. Código: `sprint-4-1-homologacao`, derivado de `sprint-4-inventory`. Sem merge na branch `main` e sem deploy de produção.

## Matriz de testes

| Área | Evidência executada | Situação |
|---|---|---|
| Compilação e regressão | GitHub Actions: `npm ci`, `npm test`, `npm run build` | Aprovado |
| Vitrine pública | Navegador Chromium: raiz, catálogo e carrinho sem banco configurado | Aprovado no cenário vazio |
| Responsividade | Chromium 390 px e 1280 px, menu móvel abre, sem overflow horizontal nas rotas verificadas | Aprovado no cenário vazio |
| Guardas do painel | Visitante recebe redirecionamento para login em dashboard, produtos, estoque, equipe, domínios e nova loja | Aprovado |
| Cadastro/login sem configuração | Botões corretamente desabilitados na ausência das variáveis Supabase | Aprovado |
| Confirmação inválida de e-mail | Redirecionamento ao login | Aprovado |
| Lojas A/B e proprietário | Duas identidades temporárias, duas lojas privadas, criação de loja e vínculo automático de owner | Aprovado via SQL com claims simuladas |
| Produtos e categorias | Isolamento de leitura por tenant, inserção transacional, rascunhos e edição de categoria | Aprovado via SQL |
| Equipe | Convite, visualização pelo destinatário, aceite, uso único e revogação | Aprovado via SQL |
| Permissões | Tentativa de cadastrar produto em loja alheia bloqueada; administrador não altera identidade da loja | Aprovado via SQL |
| Domínios | Proprietário registra e remove domínio pendente; usuário alheio não consulta nem registra | Aprovado via SQL |
| CSV | Importação de lote válido e rollback integral de lote inválido | Aprovado via SQL |
| Imagens | Política de leitura do Storage corrigida; leitura somente para loja/produto publicados; arquivamento oculta a imagem; escrita somente por membro | Aprovado **somente para metadados SQL** |
| Variantes e estoque | SKU transacional, histórico, contagem física, limite mínimo, reserva protegida | Aprovado via SQL |
| Concorrência | Duas transações solicitam retirar 4 unidades de estoque 5; somente uma aceita, saldo final 1 | Aprovado no cenário testado |
| Pedidos, pagamentos e fiscal | Operações de escrita não expostas aos papéis da API; checkout e emissão ainda não implementados | **Não aplicável** |
| Upload/download real | Fluxo de arquivo, URLs assinadas e renderização de fotos com sessão real | **Pendente** |
| Autenticação E2E | Cadastro, login, confirmação, sessão persistida, convites e revogação com 2 contas reais no navegador | **Pendente** |
| Painel autenticado | CRUD completo e navegação com dados reais no desktop/mobile | **Pendente** |
| Publicação comercial | Domínio, pagamentos, frete, fiscal, observabilidade, backup e configuração de segurança | **Bloqueado** |

### Correções realizadas

1. **Storage:** a política `atelier_catalog_image_public_read` usava `stores.name` no lugar de `storage.objects.name` (resolução ambígua do nome da coluna). Foi corrigida por migração incremental e testada em loja privada, publicada e produto arquivado.
2. **Histórico de migrações:** nomes de arquivos SQL alinhados, na branch de QA, às **11 versões remotas já aplicadas**. A comparação de nome+versão retornou 11 correspondências de 11. O banco não foi recriado e nenhuma migração histórica foi reexecutada.

### Reprodução

- `platform/tests/homologacao-rls-duas-lojas.sql`
- `platform/tests/homologacao-storage-rls.sql`
- `platform/tests/homologacao-operacoes-catalogo.sql`
- `platform/tests/inventory-sprint4.sql`
- `platform/tests/catalog-sprint3.sql`
- `platform/tests/browser-smoke.mjs` (executado pelo GitHub Actions após `npm run build`)

Os arquivos SQL exigem o **banco de desenvolvimento** com uma loja privada e devem ser executados integralmente; todas as alterações são revertidas via `ROLLBACK`. As identidades SQL de A/B **não substituem** sessões reais de Supabase Auth.

### Integridade final

Após os testes: 1 usuário e 1 loja reais, loja não publicada, zero produtos/variantes/movimentações/convites/domínios/imagens de QA persistentes.

### Bloqueadores ainda abertos

1. **Auth:** proteção contra senhas comprometidas permanece desativada no Security Advisor. Ativar no Supabase Auth quando disponível para o plano.
2. **E2E real:** testar com duas contas reais, navegadores separados e imagens reais antes de afirmar homologação total.
3. **Migrações:** embora os nomes locais coincidam com o histórico remoto, ainda falta uma verificação independente pelo Supabase CLI, antes de usar `supabase db push`. Não fazer push automático só com base nesta comparação.
4. **Produto:** importação CSV não inclui variantes múltiplas nem fotos; painel de estoque limita a consulta a 500 SKUs e catálogo a 100 produtos por página; existem lacunas de paginação/escala.
5. **Transações comerciais:** checkout, pagamento, reserva de pedidos, frete e emissão fiscal continuam desabilitados.
6. **Hospedagem:** nenhum deploy de produção realizado nesta homologação.

**Decisão:** manter PR em rascunho; corrigir as pendências de Auth e E2E antes de liberar a Sprint 5 comercial.
