# Roadmap de sprints — Atelier Commerce SaaS

## Visão geral
O produto contém duas interfaces separadas: **loja pública** para os consumidores e **painel administrativo** para cada empresa. O código do tema Shopify legado continua na raiz do repositório; a plataforma Next.js vive em `platform/`.

| Sprint | Escopo | Critério de aceite |
|---|---|---|
| 1 — Identidade e separação | Homepage fiel ao conceito visual atual, catálogo, carrinho sem checkout ativado, estrutura de autenticação e rotas administrativas separadas | Build Next.js e testes de regressão aprovados; URL pública da vitrine e URL /admin/login |
| 2 — Onboarding multi-loja | Projeto Supabase dedicado, migrações, criação de loja, convite de operadores, isolamento por tenant | Auditoria RLS com contas de lojas diferentes; fluxo completo login → loja → painel |
| 3 — Catálogo completo | Fotos em Storage, variantes, SKU, categorias, importação CSV, rascunho/publicação | Produto publicado aparece na vitrine e filtros; dados importados verificáveis |
| 4 — Estoque | Histórico, inventário, limite mínimo, reserva transacional, controle de conflitos | Concorrência não gera estoque negativo |
| 5 — Pedidos e pagamento | Checkout server-side, Pix/cartão, antifraude, webhook, estorno, status | Compras de teste autenticadas e reconciliadas, sem pedido pago sem confirmação |
| 6 — Frete e fiscal | CEP, transportadoras, rastreio, NF-e/NFC-e via serviço fiscal aprovado | Cotação real; emissão autorizada em homologação, XML/DANFE verificáveis |
| 7 — Plataforma SaaS | Portal master, planos, limites, cobrança recorrente e domínios | Cliente contrata e provisiona loja isolada; trial e cancelamento rastreáveis |
| 8 — Homologação | Segurança, LGPD, backups, qualidade, observabilidade, cenários fiscais | Aceite documentado e publicação comercial habilitada |

### Sprint 1
- [x] Códigos públicos agrupados em `app/(store)/`, com layout independente
- [x] Área administrativa mantida em `app/admin/`, com navegação e autenticação Supabase
- [x] Homepage reformulada com hero escuro, tipografia expressiva, coleções reais e seções editoriais
- [x] Menu mobile e footer com acesso discreto ao lojista
- [x] Testes automatizados específicos para separação das interfaces
- [ ] Banco dedicado habilitado: depende de provisionamento autorizado
- [ ] Compra real: planejada para a Sprint 5

Não são usados produtos ou pedidos inventados. A foto do banner é um recurso visual de interface herdado da prévia; não é um item disponível para venda.

### Observações de implementação
`/admin/login` é a entrada do lojista. O layout da administração não herda cabeçalho ou rodapé da vitrine. O painel permanece restrito por `requireAdmin()`; para utilização real será preciso provisionar o banco Supabase e vincular usuários às suas lojas.

### URLs
- Vitrine: https://atelier-commerce-platform.vercel.app/
- Administração: https://atelier-commerce-platform.vercel.app/admin/login
- Código: https://github.com/ppedromartins11/atelier-commerce/tree/main/platform

### Sprint 2 — onboarding multi-loja (código desenvolvido)
- [x] Registro de contas com confirmação de e-mail pelo Supabase Auth
- [x] Cadastro de empresas como rascunho, com proprietário atribuído por trigger
- [x] Seleção de loja ativa pelo lojista, com cookie somente de preferência e checagem de associação a cada ação
- [x] Convites para administradores com e-mail verificado e validade de sete dias
- [x] Acesso de administradores restrito à loja vinculada, com políticas de isolamento
- [x] Vitrines isoladas em `/loja/[tenant]`, incluindo catálogo e carrinho com chaves distintas
- [x] Solicitações de domínio sem DNS ou ativação automáticos
- [x] Testes estáticos de isolamento e compilação automatizada
- [ ] Provisionar banco Supabase exclusivo: a conta exige confirmação de custo, mesmo com estimativa de US$ 0/mês
- [ ] Aplicar migrações, testar política RLS com usuários reais de lojas diferentes
- [ ] Configurar e testar template de confirmação de e-mail e fluxo de convite
- [ ] Homologar operações em uma instância de produção antes de vender

**A plataforma ainda não está habilitada para lojas reais.** O código-fonte e telas não substituem o provisionamento e a homologação do banco de dados.
