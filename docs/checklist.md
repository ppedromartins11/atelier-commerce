# Checklist de homologação antes de vendas reais

## Catálogo
- [ ] Todos os produtos têm nome, imagem, variante, preço, SKU e estoque corretos.
- [ ] A vitrine inicial mostra apenas dados reais.
- [ ] Ordenação e filtros funcionam em conjunto, inclusive ao mudar a ordenação.
- [ ] Páginas de produto com múltiplas variantes exibem preço e disponibilidade corretos.
- [ ] Produto indisponível não pode ser comprado.

## Navegação
- [ ] Menus e links ativos no computador e no celular.
- [ ] Busca com termo válido, inválido e vazio.
- [ ] Teclado e leitor de tela nas etapas principais.
- [ ] Layout testado em larguras 320, 375, 414, 768, 1024 e 1440 px.
- [ ] Políticas e contato acessíveis.

## Pedido e checkout
- [ ] Adição do produto/variante correta.
- [ ] Remoção, atualização de quantidades, subtotal e descontos.
- [ ] CEP e entrega válidos, inválidos e fora de cobertura.
- [ ] Checkout Pix/cartão em modo de teste do provedor aprovado.
- [ ] Pagamento autorizado, recusado e cancelado sem duplicar pedidos.
- [ ] E-mails e alteração de status de pedido.
- [ ] Regras de privacidade, tributação, LGPD e comunicação comercial revisadas.

## Operação
- [ ] `npm test` passa.
- [ ] `shopify theme check` passa e warnings são revisados.
- [ ] Lighthouse e testes reais em navegadores móveis.
- [ ] Backup e rollback do tema anterior disponíveis.
- [ ] Tema publicado somente com aprovação final do lojista.
