# Abrir o Atelier Commerce no VS Code

Este ZIP contém o **repositório completo**, incluindo a plataforma SaaS Next.js em `platform/`, o tema Shopify original, a prévia visual e as migrações de banco em `platform/supabase/migrations/`.

## Executar a plataforma SaaS

1. Extraia o ZIP e abra a pasta `atelier-commerce` no VS Code.
2. Abra o terminal integrado (`Ctrl + \``).
3. Acesse a aplicação: `cd platform`
4. Instale as dependências: `npm install`
5. Crie um arquivo `.env.local` a partir de `.env.example` (opcional para visualizar a vitrine vazia).
6. Rode `npm run dev`.
7. Acesse `http://localhost:3000`.

Rotas:
- `/`: vitrine pública padrão.
- `/catalogo`: catálogo de produtos publicados.
- `/admin/login`: painel do lojista.
- `/admin/cadastro`: criar conta (após configurar banco).
- `/admin/lojas`: selecionar empresas (após configurar banco).
- `/loja/<slug>`: vitrine própria da empresa (após configurar banco).

## Testes

No terminal da pasta `platform`:
- `npm test` — testes automatizados.
- `npm run build` — build de produção.

## Banco de dados

A plataforma ainda **não possui um Supabase próprio conectado**. Não copie credenciais de outros projetos para este repositório. As migrações SQL estão na pasta `platform/supabase/migrations`. Os cadastros e a autenticação só funcionarão depois da criação do projeto Supabase dedicado, aplicação das migrações e configuração das variáveis de ambiente em `.env.local`.

As operações reais de pagamento, frete e emissão fiscal continuam desativadas. Não são necessárias para executar a vitrine visual.

## Requisitos

Node.js LTS (recomendado versão 22 ou posterior), npm e VS Code. Não há necessidade de instalar Shopify para desenvolver a plataforma SaaS.
