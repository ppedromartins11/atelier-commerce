# Atelier Commerce

Plataforma própria de comércio eletrônico para diferentes empresas. O produto está em desenvolvimento; **não está homologado para uso comercial**. O código da aplicação Next.js vive em [`platform/`](platform/). A pasta [`preview/`](preview/) conserva apenas a referência visual editorial e não vende produtos.

## Estado atual

| Área | Estado verificável |
|---|---|
| Vitrine e catálogo por loja | Código implementado; depende de banco dedicado e produtos reais |
| Cadastro de conta, empresa, equipe e domínios | Código implementado; Auth e RLS ainda não homologados em banco dedicado |
| Categorias, cadastro inicial de produto e estoque | Código implementado, inclusive RPC transacional para produto; sem teste de integração no banco |
| Carrinho | Armazenamento local por loja; não cria pedidos |
| Pedidos e documentos fiscais | Leitura administrativa de tabelas; criação e emissão desabilitadas |
| Pagamentos, frete, assinaturas e checkout | Não desenvolvidos |

Nenhuma tela representa transações, notas ou produtos fictícios como dados reais. Publicar a vitrine não ativa a finalização de compras.

## Executar localmente

Requer Node.js 22 ou superior e npm. No terminal do VS Code:

```powershell
cd platform
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Abra `http://localhost:3000`. Sem variáveis Supabase configuradas, a vitrine exibe estado vazio e o cadastro fica indisponível. Use somente um projeto Supabase **dedicado** ao Atelier Commerce para testar Auth e dados. Não reutilize credenciais ou bancos de outras aplicações.

Em `platform/.env.local`, preencha:

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase dedicado |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do mesmo projeto |
| `NEXT_PUBLIC_SITE_URL` | Origem do site para confirmação de e-mail; localmente `http://localhost:3000` |
| `STORE_SLUG` | Slug da vitrine padrão em `/`; as demais usam `/loja/<slug>` |

Não coloque chaves secretas em variáveis `NEXT_PUBLIC_`. Configure no Supabase o URL do site, os redirecionamentos permitidos e o template de confirmação para `/auth/confirm` antes de testar cadastro. A aplicação espera `token_hash` e `type` nessa rota.

## Banco e testes

As migrações em [`platform/supabase/migrations/`](platform/supabase/migrations/) devem ser aplicadas **em ordem** somente em um banco dedicado e autorizado. As migrações históricas são mantidas. A última corrige a atualização de lojas pelo proprietário e cadastra produto, variante e estoque inicial em uma transação. Como não havia banco local conectado nesta auditoria, sua execução e o isolamento real entre Loja A e Loja B seguem pendentes.

```powershell
cd platform
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

O projeto não tem comando de lint configurado. Os testes atuais incluem verificações estáticas e uma regra unitária de preço; **não provam** Auth, RLS, persistência nem comportamento no navegador.

## Organização

```text
platform/
  app/                 Vitrine, painel, Auth e rotas
  components/          Componentes compartilhados de interface
  lib/                 Acesso Supabase, catálogo e formatação
  supabase/migrations/  Esquema e evolução do banco
  tests/               Testes locais
  docs/                Arquitetura e roadmap
preview/               Referência visual estática
.github/workflows/      Build, testes e exportação
```

O tema Shopify anterior foi removido da árvore de trabalho. Pode ser recuperado pelo commit `b5e70d7` do histórico Git ou pela tag local `pre-saas-cleanup-2026-11-19`.

## Próximos passos e publicação

Veja o [roadmap](platform/docs/sprints.md), a [arquitetura](platform/docs/arquitetura.md) e a [auditoria de 19/11/2026](AUDITORIA.md). A próxima validação exige banco de desenvolvimento dedicado, aplicação controlada das migrações e teste cruzado com duas lojas e usuários distintos. Depois, concluir edição e publicação de catálogo antes de checkout, pagamentos ou operação fiscal.

Para publicar a aplicação, configure a raiz do projeto de hospedagem como `platform/`, instale com `npm ci` e use `npm run build`. Configure as variáveis no ambiente correspondente e homologue Auth, RLS e dados reais antes de promover qualquer versão a clientes. A prévia em `preview/` é independente e não deve ser usada como evidência da versão da plataforma.
