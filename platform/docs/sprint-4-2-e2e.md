# Sprint 4.2 — Homologação E2E com Playwright

**Status: parcialmente aprovada.** Não liberar para operação comercial.

## Execução comprovada nesta etapa

- Repositório: `ppedromartins11/atelier-commerce`, branch `sprint-4-2-e2e`.
- Ambiente isolado: Sandbox Vercel efêmero (não foi criado deploy de produção).
- Supabase de desenvolvimento: `pnfixgdfnzphrygtfmsd`, acessado por chave **publicável**.
- Testes Playwright efetivamente executados no Chromium com o Supabase real: **4 aprovados, 0 reprovados** após atualizar a configuração para o estado atual de publicação da loja.
- Abrangência: homepage, catálogo, carrinho, login, cadastro, proteção de rotas administrativas, navegação móvel, 390/768/1280px, validação do formulário, rejeição de login inválido, consultas públicas da Data API, RPC de inventário anônima proibida.
- Verificações do GitHub Actions da branch: suíte Node, TypeScript, build Next.js e smoke de navegação em Chromium aprovados.

**Atenção:** no segundo ensaio, a loja `endereco-ficticio` estava **publicada**. O teste inicialmente esperava uma loja privada e falhou por suposição incorreta. A configuração foi corrigida, sem alterar o banco. Não interpretar essa publicação como vazamento de dados.

## Homologação autenticada: preparada, ainda não executada

A suíte `platform/tests/e2e/authenticated.spec.mjs` usa a API administrativa do Supabase Auth para **criar dois usuários confirmados descartáveis** e o Playwright para executar a jornada real:
- Login, cadastro de duas lojas e isolamento de permissões entre proprietários.
- CRUD de categorias e produtos, SKU/variante, upload/exibição/remoção de PNG real, imagens via URL assinada.
- Limite mínimo, movimentação e contagem de estoque, importação CSV.
- Publicação, vitrine pública, convite de administrador, aceite, revogação, domínio pendente e arquivamento.
- Navegação administrativa em viewport móvel.
- Limpeza das duas contas e lojas criadas pelo ensaio, via API administrativa, mesmo após falha.

**Esse teste ainda não foi homologado.** Sem uma chave administrativa de QA autorizada, ele é **explicitamente ignorado**. O fluxo de confirmação de e-mail por entrega real também não foi testado: as contas de QA são confirmadas pela API administrativa, sem envio de e-mail.

Tentativas de cadastro público com endereços reservados foram rejeitadas pelo Auth; a criação de credenciais pela ferramenta administrativa direta foi bloqueada. Não utilizar e-mails reais de terceiros nem inserir segredos no repositório.

## Configuração segura para o E2E completo

No GitHub → Settings → Secrets and variables → Actions, criar os **repository secrets**:
- `QA_SUPABASE_URL`: URL do projeto **de desenvolvimento**.
- `QA_SUPABASE_PUBLISHABLE_KEY`: chave publicável da Data API.
- `QA_SUPABASE_SERVICE_ROLE_KEY`: chave administrativa de desenvolvimento, guardada **somente** em GitHub Secrets, nunca como `NEXT_PUBLIC_*` nem em commits.

Nas **repository variables**, definir:
- `QA_E2E_EMAIL_DOMAIN`: domínio de e-mail de teste sob seu controle, aceito pelo Supabase.
- `QA_PRIVATE_STORE_SLUG` e `QA_PRIVATE_STORE_ID`: opcionais; preencher **somente** quando se trata de uma loja realmente não publicada. Deixar vazios para lojas publicadas.

O workflow `.github/workflows/e2e.yml` oferece os escopos `public` e `full`. O modo `full` exige segredos configurados, restringe a URL ao projeto `pnfixgdfnzphrygtfmsd`, gera identidades aleatórias e elimina apenas usuários/lojas que criou.

**Observação GitHub:** workflows `workflow_dispatch` só são acionáveis pela interface após o arquivo existir na branch padrão. Como o PR continua em rascunho, **não houve execução de `full` pelo Actions**. Até uma revisão da configuração, também é possível executar localmente `npm run test:e2e:public` com variáveis de QA.

## Controles e limitações

- `playwright.config.mjs` impede que `QA_SUPABASE_SERVICE_ROLE_KEY` seja repassada ao processo Next.js, desativa gravação de vídeo, screenshots e traces que poderiam conter dados de login, e não registra senhas em logs.
- Os scripts verificam URL exata do Supabase de desenvolvimento e exigem sinal explícito `QA_E2E_ALLOW_MUTATIONS=enabled` antes de operações com escrita.
- A limpeza automática usa somente os IDs dos usuários criados na rodada e lojas pertencentes a esses usuários. Em caso de erro na limpeza, a suíte falha e indica que os registros descartáveis precisam de conferência.
- A aplicação atual **não tem** checkout, pagamentos, frete, reserva de pedido ou emissão fiscal operacionais. Não é possível homologar jornadas comerciais ainda inexistentes.
- A habilitação da proteção contra senhas comprometidas no painel Supabase Auth e a verificação final pelo Supabase CLI permanecem pendentes.

## Decisão

Aprovar somente a parte pública de E2E. **Não fazer merge nem deploy comercial** até executar e aprovar a suíte autenticada com credenciais de QA e revisar os bloqueadores anteriores. 
