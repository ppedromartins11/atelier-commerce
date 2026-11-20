# Sprint 3.3 — Catálogo administrativo (20/11/2026 UTC)

## Situação

Implementação em branch `sprint-3-3-catalog`, sobre `sprint-3-supabase-hardening`, PR #2 em rascunho. Banco exclusivo de desenvolvimento `pnfixgdfnzphrygtfmsd`. **Não está homologado para produção nem para vendas.**

## Funcionalidades implementadas

1. Tela de edição em `/admin/produtos/[id]`: nome, endereço, preço, categoria, descrição e publicação; operações limitadas ao tenant ativo.
2. Arquivamento reversível com `archived_at`, evitando exclusão física e ocultando produtos arquivados da vitrine; restauração como rascunho.
3. Gestão de variantes (SKU, nome, cor, tamanho e código de barras). Criação com saldo inicial e movimentação atômicos. Alterações posteriores de saldo continuam exclusivas da RPC de inventário.
4. Renomear e excluir categorias não referenciadas por produtos.
5. Imagens de produto em bucket privado `catalog-images`: upload JPG/PNG/WebP, limite de 5 MB/arquivo e 8 imagens/produto. Acesso condicionado a políticas de Storage; a rota `/api/catalog-image/[productId]` verifica acesso ao produto antes de gerar URL assinada por 60 segundos.
6. Importação CSV (ponto e vírgula) de até 100 produtos por lote, com modelo `/modelo-importacao-catalogo.csv`, verificação de categorias, nomes, SKUs e preço. Todos os produtos entram como rascunhos. **Um erro reverte o lote inteiro** pela RPC transacional.
7. Estados de falha de consulta explícitos nas telas de produtos e estoque.

## Migrações aplicadas no banco de desenvolvimento

- `catalog_lifecycle_and_private_images`, versão remota `20261120021324` (arquivo `20261120021324_catalog_lifecycle_and_private_images.sql`)
- `catalog_image_mutation_rpc`, versão remota `20261120021414` (arquivo `20261120021414_catalog_image_mutation_rpc.sql`)
- `fix_catalog_reparent_trigger`, versão remota `20261120021938` (arquivo `20261120021938_fix_catalog_reparent_trigger.sql`)
- `atomic_catalog_csv_import`, versão remota `20261120022145` (arquivo `20261120022145_atomic_catalog_csv_import.sql`)

As 5 migrações remotas anteriores também continuam registradas. **Nota de homologação 4.1:** os nomes dos arquivos foram alinhados às versões registradas no Supabase, somente na branch de QA. Ainda é necessário validar o plano de migrações com CLI antes de fazer qualquer operação de push.

## Validação

- Execução SQL `platform/tests/catalog-sprint3.sql`: **PASS** após corrigir o gatilho de tenant. Verificados criação/edição de variante, movimento inicial, publicação temporária, ocultação após arquivamento e bucket privado.
- Importação de dois produtos via RPC: 2 produtos e 2 variantes dentro de transação; `ROLLBACK` aplicado.
- Testes Node incluem regras estáticas e parser CSV com aspas, preço decimal brasileiro e descrição multilinha.
- Workflow GitHub Actions executa `npm ci`, `npm test` e `npm run build`. Registrar resultado final do último commit antes de aprovar PR.
- Banco preservado após testes: uma loja não publicada, zero produtos, variantes e movimentações de teste.

## Pendências / riscos

- Validar upload, remoção e URL assinada no navegador com imagens reais; verificar política Storage em sessões Auth reais com tenant A/B.
- Testes reais de Auth com dois proprietários e duas lojas, convites/revogação, cookies forjados e concorrência.
- Revisar imagens legadas externas (HTTPS) e qualidade real dos arquivos (checagem de assinatura é mínima, não decodifica imagens).
- Produtos não implementam exclusão física; apenas arquivamento. CSV importa somente uma variante inicial por produto, editável depois; não importa arquivos de imagem.
- Paginação atual limita a 100 produtos no painel e 100 na vitrine. Planejar paginação completa antes de escalar catálogo.
- `auth_leaked_password_protection` no Security Advisor continua como alerta de configuração do Auth.
- A Vercel continua limitada por quota de builds no plano atual; **sem deploy de produção**.

## Próxima homologação

1. Aprovar os checks GitHub Actions e testar editor, categoria, importação e imagem no Next.js local.
2. Criar conta B e loja B para teste cruzado de RLS, Storage e convites.
3. Resolver alerta de segurança e migrar histórico de versões antes de qualquer deploy automatizado.
4. Rever fluxo de estoque em concorrência, otimização de índices e UX mobile do catálogo.
