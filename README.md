# Atelier Commerce — Tema Shopify 2.0

**Tema original e reutilizável** para lojas virtuais de tênis, roupas, acessórios e outros segmentos. Desenvolvido com **Liquid, HTML, CSS e JavaScript**, usando o catálogo, carrinho e checkout nativos da Shopify. O projeto usa **Xo Gang Brazil apenas como referência funcional**, sem copiar identidade visual, código privado ou conteúdos da marca.

## O que já foi desenvolvido

- Homepage com banner configurável, seções de categorias, coleção em destaque, apresentação de marca e newsletter.
- Menu desktop/mobile com navegação por categorias da loja.
- Vitrine real de produtos da Shopify (imagens, valores, disponibilidade e preço promocional).
- Coleções com ordenação, filtros nativos do catálogo e paginação.
- Página de produto com imagens, variantes, quantidade, compra e pagamento acelerado (conforme configuração da loja).
- Carrinho com alteração de quantidades, remoção, descontos aplicados e botão de checkout nativo.
- Busca, páginas institucionais, contato, blog, artigo, 404 e lista de coleções.
- Cores, logotipo, menus, banners, coleções e textos configuráveis no editor do tema.
- Layout responsivo, landmarks semânticos, foco visível e preferência de movimento reduzido.
- Testes automatizados de estrutura e consistência de templates e schemas.

> **Estado da entrega:** versão inicial de desenvolvimento, não homologada para comercialização. Sem credenciais de uma loja Shopify, não é possível confirmar renderização Liquid, disponibilidade de produto, frete, pagamentos, filtros e checkout em ambiente real. A loja será publicada somente após esses testes.

## Organização

```text
assets/              CSS e JS
config/              Configurações e cores
layout/              Estrutura HTML principal
locales/             Idiomas
sections/            Seções e páginas comerciais
snippets/            Componentes reutilizáveis
templates/           Mapeamento das páginas JSON
tests/               Testes automatizados
docs/                Guias de implantação e checklist
.github/workflows/   Validação básica a cada push
```

## Pré-requisitos

1. Node.js 20 ou superior.
2. Shopify CLI, instalada com `npm install -g @shopify/cli@latest`.
3. Conta de desenvolvedor Shopify e loja de desenvolvimento (ou acesso autorizado a uma loja existente).
4. Produtos e coleções **reais** cadastrados na loja. Não são enviados produtos fictícios.

## Rodar e testar

```bash
npm test
npm run check:js
shopify theme check
shopify theme dev --store nome-da-loja.myshopify.com
```

Abra a URL de preview fornecida pela Shopify CLI. No editor de temas, selecione coleções nos blocos de categorias e na vitrine, defina menus, configure logo e banner. Para manter descontos, frete, políticas e preços coerentes, gerencie essas regras no administrador Shopify.

**Importante:** `shopify theme dev` requer login/autorização na loja. Para enviar sem tornar público, utilize `shopify theme push --unpublished --store nome-da-loja.myshopify.com`. A publicação da loja envolve ativar um tema e conferir checkout, pagamentos e impostos, não apenas publicar o repositório GitHub.

## Pagamentos

O código apresenta a compra pelo formulário Shopify e direciona para o checkout nativo. **Não cria nem processa cartões, Pix ou dados bancários.** Configure um provedor de pagamento compatível na administração da loja e teste as transações na modalidade de teste homologada por ele antes de vender. Não declare valores parcelados ou descontos Pix fixos sem regras efetivamente configuradas.

## Adaptação por segmento

Personalize cores e componentes nas configurações do tema e configure produtos/coleções reais. Se o cliente precisar de recursos específicos (ex.: grade de tamanhos, kits, comparador de produtos), desenvolva seções independentes sem alterar o fluxo central de pedidos. Cada cliente utiliza sua própria instância Shopify; o tema pode compartilhar o mesmo código-fonte base.

## Licença e autoria

Código autoral gerado para este projeto; não distribui recursos proprietários de Xo Gang Brazil ou Aloft Agência. Consulte as licenças dos aplicativos, fotografias, fontes, vídeos e conteúdos adicionados futuramente. Este projeto não está associado a essas marcas.

## Publicar no GitHub

Na pasta raiz do projeto, com [GitHub CLI](https://cli.github.com/) autenticada (`gh auth login`), execute:

```bash
bash scripts/publicar-github.sh
```

O script cria o repositório público `ppedromartins11/atelier-commerce` na sua conta caso ainda não exista, ou envia a branch `main` caso já exista. Não publica automaticamente o tema como loja online.
