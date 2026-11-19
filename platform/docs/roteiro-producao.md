# Caminho para uma operação comercial real

## P0: Fundamentos

- [x] Aplicação Next.js com público/admin separado
- [x] Esquema multi-loja, RLS e histórico de estoque
- [x] Catálogo baseado em dados reais, sem produtos falsos
- [ ] Projeto Supabase dedicado, credenciais e migração aplicados
- [ ] Testes E2E autenticados de criação/edição de produto e controle de concorrência

## P1: Catálogo e operação

- [ ] Gestão de mídias via Supabase Storage com permissões e otimização
- [ ] Variações por tamanho/cor com preço, fotos e SKU próprios
- [ ] Importação/exportação CSV, paginação e filtros administrativos
- [ ] Estoque mínimo, compra de fornecedores, inventário e relatórios
- [ ] Cadastros comerciais, atendimento e políticas de troca

## P2: Pedidos, frete e pagamentos

- [ ] Cálculo de frete/CEP via serviço autorizado e zonas da loja
- [ ] Checkout com endereço e dados mínimos de cliente
- [ ] Gateway adequado (Mercado Pago/Pagar.me/etc.) com webhook assinado e idempotência
- [ ] Reserva/baixa de estoque em transação SQL; anti-overselling e estorno
- [ ] Confirmação de pedidos, notificações e cancelamentos
- [ ] Política de privacidade e retenção de dados conforme LGPD

## P3: Fiscal e operação brasileira

- [ ] Perfil fiscal por estabelecimento, NCM, CEST, CFOP, tributação por produto
- [ ] Emissor/integradora de NF-e (modelo 55) e NFC-e (65) conforme estado e operação
- [ ] Certificado digital e credenciamento em ambiente homologação
- [ ] Assinatura, autorização SEFAZ, contingência, inutilização, cancelamento e carta de correção conforme suporte aplicável
- [ ] Download seguro XML/DANFE, auditoria e conciliação do pedido
- [ ] Validação por contador e profissional tributário antes da primeira emissão

**Proibido:** simular aprovação fiscal, confirmar pagamento sem webhook ou apresentar número de nota fiscal como emitido sem autorização SEFAZ.
