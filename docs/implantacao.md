# Implantação da primeira loja

1. Criar a loja no ambiente oficial Shopify e autorizar a Shopify CLI.
2. Cadastrar produtos reais, imagens licenciadas, variantes de tamanho/cor, SKU e estoque.
3. Criar coleções e menus em **Loja virtual > Navegação**.
4. Revisar `npm test`, `node --check assets/theme.js` e `shopify theme check`.
5. Carregar o tema como não publicado com `shopify theme push --unpublished --store ...`.
6. Abrir o editor de tema e preencher configurações de header, banners, categorias, coleção e rodapé.
7. Criar páginas de contato, entrega, troca/devolução, privacidade e termos, vinculando-as aos menus.
8. Configurar domínios, impostos, localidades atendidas, moedas, frete e política de estoque.
9. Configurar gateway de pagamento, antifraude e notificações.
10. Testar em desktop/mobile e todas as jornadas do checklist antes de publicar.

## Restrições

- A loja não opera pagamentos apenas porque o repositório existe no GitHub.
- Nunca copiar credenciais da loja para arquivos versionados.
- Métodos de pagamento, parcelamentos e descontos dependem da configuração de pagamentos da loja.
- Filtros de coleções dependem do cadastro de produtos e das opções disponíveis na Shopify.
