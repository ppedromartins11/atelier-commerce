# Auditoria e limpeza — 19/11/2026

## Base examinada

Aplicação Next.js em `platform/`, três migrações SQL, rotas, componentes, testes, documentação, configuração npm e workflows; tema Liquid na raiz e prévia estática em `preview/`. A cópia local chegou sem `.git` e sem arquivos ocultos. Ela foi vinculada ao histórico de `origin/main` (`b5e70d7`), e os arquivos ocultos rastreados foram restaurados. As diferenças preexistentes de `platform/next-env.d.ts` e `platform/tsconfig.json` foram preservadas.

## Achados priorizados

| Prioridade | Achado e impacto | Tratamento nesta execução |
|---|---|---|
| P0 | Não há banco Supabase dedicado conectado nem homologação com usuários da Loja A e B. RLS não pode ser considerado validado em execução. | Migração e testes locais preparados; aplicação em banco e testes cruzados pendentes. |
| P0 | `stores_manage` da primeira migração permite a qualquer administrador atualizar a loja, embora publicação e identidade sejam reservadas ao proprietário. | Nova migração remove a política e cria atualização exclusiva do proprietário; interface e ação seguem a mesma regra. |
| P0 | Saldo de variante e histórico aceitavam escrita direta de usuário autenticado conforme as políticas iniciais, contornando a RPC de estoque. | Nova migração revoga escrita direta e concentra cadastro e ajuste em funções privadas com verificação de loja. Execução real pendente. |
| P1 | Cadastro de produto usava três operações independentes. Uma falha podia deixar produto, variante ou histórico inconsistentes. | Server Action passou a chamar uma RPC transacional; migração preparada. |
| P1 | Categorias na rota `/loja/[tenant]/catalogo` eram buscadas na vitrine padrão. | Consulta passou a usar o slug da rota. |
| P1 | Validação de preço aceitava centavos acima do limite `integer` do PostgreSQL. | Limite corrigido e testado no extremo. |
| P1 | Cadastro de conta podia usar um endereço de produção implícito para confirmação quando a variável do site faltava. | Endereço passou a ser obrigatório; exemplo local atualizado. |
| P2 | README e prévia apresentavam Shopify como destino do produto; CI e arquivos Liquid permaneciam na raiz. | Documentação e prévia corrigidas; tema e CI próprios foram retirados após tag de recuperação. |
| P2 | O build inferia a raiz a partir de dois lockfiles e o CI não usava instalação reproduzível. | Raiz Turbopack definida; `platform/package-lock.json` incluído e CI alterado para `npm ci`. |
| P2 | Telas administrativas substituem algumas falhas de consulta por listas vazias. | Pendente: tratar erros por módulo e mostrar falha sem sugerir ausência de dados. |

## Limpeza e estrutura resultante

Removidos da árvore de trabalho: `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`, `tests/`, `scripts/`, `docs/` e `package.json` da raiz, todos exclusivos do tema Shopify; também o workflow de validação do tema. O `package-lock.json` da raiz, sem dependências e sem pacote correspondente, foi retirado. `COMO-ABRIR-NO-VSCODE.md` foi consolidado neste README. Nenhum arquivo de migração foi excluído. O ponto de recuperação é o commit `b5e70d7` e a tag **local** `pre-saas-cleanup-2026-11-19`.

Mantidos: `platform/` como produto; `preview/` como referência visual e possível origem de deploy independente; `.github/workflows/platform.yml` e `export-vscode.yml`. Não houve movimentação de arquivos comerciais. `node_modules/`, `.next/`, `.env.local` e `supabase/.temp/` ficam fora do Git pelas regras de ignore. A permanência de `preview/` deve ser revista somente após conferir o vínculo do projeto Vercel e a utilidade da referência visual.

```text
atelier-commerce/
  .github/workflows/   build/teste e exportação
  platform/            aplicação Next.js, migrações, testes e docs
  preview/             referência visual estática
  README.md            instalação e estado operacional
  AUDITORIA.md         registro desta revisão
```

## Estado real dos módulos

| Módulo | Estado nesta cópia |
|---|---|
| Vitrine, busca, categorias e produto | Implementado; consultas reais dependem de banco e dados; categoria por tenant corrigida localmente |
| Carrinho | Parcial: persistência local por loja, sem validação de servidor nem pedido |
| Auth, cadastro de empresa e seleção de loja | Implementado, não testado com Supabase dedicado |
| Convites, equipe e revogação | Implementado, não testado com usuários reais; sem envio automático de e-mail |
| Domínios | Registro pendente; sem verificação DNS nem conexão |
| Produtos, categorias e estoque | Parcial: criação e ajuste têm código e migração; sem edição completa, imagens em Storage, variantes avançadas ou CSV |
| Pedidos e documentos fiscais | Apenas leitura administrativa de tabelas; sem criação ou emissão |
| Pagamentos, frete, clientes, assinaturas | Não desenvolvidos ou bloqueados por integração externa |

## Validação e limites

Na pasta `platform/`: `npm ci --no-audit --no-fund` instalou 37 pacotes; `npm test` aprovou 21 testes; `npx tsc --noEmit` e `npm run build` passaram. O projeto não configura lint. Os testes de RLS existentes verificam texto de políticas e rotas; **não simulam dois usuários nem provam isolamento real**. No Chromium local, a homepage, o catálogo vazio e o login abriram em 390 px; a homepage também abriu em 1280 px. Não houve rolagem horizontal nessas telas, e o menu móvel abriu com seus links. Isso não valida todas as páginas nem estados com dados reais. Não havia `.env.local`, PostgreSQL local, daemon Docker ou projeto Supabase dedicado autorizado. Por isso a migração mais recente, fluxos de Auth, persistência, concorrência e deploy não foram homologados. Nenhuma migração remota nem publicação foi executada.

Consulta remota somente de leitura em 19/11/2026: a conexão Supabase disponível não lista projeto dedicado ao Atelier Commerce. Os dois projetos Vercel, `atelier-commerce` (prévia) e `atelier-commerce-platform` (Next.js), mostram como último deployment de produção pronto o commit `b5e70d7`, anterior aos commits locais desta auditoria. Portanto, as páginas públicas ainda não contêm as correções descritas aqui. Nenhuma configuração ou deployment remoto foi alterado.

## Próxima sprint verificável

1. Provisionar um banco **dedicado e autorizado**, aplicar as três migrações e rodar advisors. Confirmar comportamento de grants, funções e triggers.
2. Exercitar duas contas e duas lojas: leitura, alteração, cookie forjado, slugs, RPCs, convite, revogação, publicação e concorrência. Corrigir qualquer falha antes de cadastrar clientes.
3. Concluir um fluxo de catálogo: editar e excluir produto com integridade, categoria, imagem privada em Storage e publicação; testar a vitrine em larguras de celular e desktop.
4. Só então avançar para pedidos e checkout com integrações reais. Pagamentos e emissão fiscal permanecem desabilitados até homologação específica.
