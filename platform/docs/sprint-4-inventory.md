# Sprint 4 — Gestão de estoque e concorrência (20/11/2026 UTC)

## Estado
Implementação na branch `sprint-4-inventory`, sobre `sprint-3-3-catalog`. PR #3 em rascunho; **sem merge e sem deploy de produção**. Banco de desenvolvimento exclusivo `pnfixgdfnzphrygtfmsd`.

## Implementação
- `product_variants.reorder_point`: limite mínimo por SKU, padrão 0 (sem alerta de reposição).
- `inventory_counts`: tabela de contagens físicas com saldo anterior, quantidade contada, delta, justificativa, usuário e horário; RLS por loja; sem permissões diretas de gravação para `anon` ou `authenticated`.
- `public.set_inventory_reorder_point`: RPC para atualizar o mínimo sob verificação de associação à loja.
- `public.reconcile_inventory_count`: contagem física sob `FOR UPDATE`, rejeitando quantidades abaixo de `reserved`. Sempre registra a conferência em `inventory_counts`; registra em `stock_movements` apenas diferenças não nulas.
- O ajuste de estoque existente `public.adjust_inventory` continua serializado por bloqueio da variante.
- Painel `/admin/estoque`: indicadores de SKUs consultados/baixos/esgotados, busca por SKU, filtros, limite mínimo, entradas e saídas, contagem física e auditoria.
- `lib/inventory.ts` centraliza saldo disponível = saldo físico − reservado e estado de alerta.
- Larguras pequenas usam controles flexíveis e tabela rolável; sem testes reais de navegador nesta execução.

## Validação automatizada
- GitHub Actions no commit `ae5ff96b`: 35 testes Node aprovados; instalação e `npm run build` aprovados.
- `platform/tests/inventory-sprint4.sql`: execução real em banco dedicado retornou PASS. Conferiu grants, autorização, estoque reservado, contagem de valor idêntico, delta de ajuste e isolamento simulado.
- Teste de duas transações concorrentes usando conexões separadas: saldo inicial de 5 unidades, duas retiradas de 4. Apenas uma retirada foi aceita; a outra retornou `Estoque insuficiente`. Saldo final 1, com 2 movimentos totais (saldo inicial e retirada aceita).
- Registros de QA removidos ao final: 0 produtos e 0 variantes temporários remanescentes. Nenhum usuário real foi criado para a simulação.
- `inventory_counts` não possui grants de INSERT, UPDATE, DELETE ou TRUNCATE para os papéis `anon` e `authenticated`.

## Migrações
- `platform/supabase/migrations/20261120030000_inventory_counts_reorder_rpc.sql` aplicada via conector à instância exclusiva; versão remota `20261120025251`.
- **Não executar `supabase db push` até reconciliar o histórico remoto (múltiplos timestamps remotos diferem dos arquivos da branch).** O restante das 9 migrações já estava aplicado. Não reexecutar migrações antigas manualmente.

## Pendências para homologação comercial
1. Testar a interface do inventário no browser: contagem, ajuste, filtros, navegação mobile, erros e confirmação após atualização.
2. Homologar usuários Supabase Auth reais de duas empresas e tentar operações cruzadas; testes até aqui usam identidade simulada no PostgreSQL.
3. Testar upload/remoção de imagens do catálogo da Sprint 3.3 em sessão de usuário e visitante.
4. O checkout continua indisponível. Não foi implementada reserva automática de estoque vinculada a pedidos. O campo `reserved` existe, mas qualquer fluxo futuro de reserva requer API confiável, idempotência, prazo e expiração seguros.
5. Supabase Security Advisor: proteção de senhas comprometidas desativada (`auth_leaked_password_protection`). Verificar painel de Auth e disponibilidade do recurso.
6. Otimizar volume de catálogo maior que 500 SKUs por loja; indicadores atuais representam apenas a seleção carregada.
7. Validar concorrência com reservas reais quando o checkout da Sprint 5 existir e executar testes E2E adicionais.

## Execução local
```bash
git fetch origin
git switch --track origin/sprint-4-inventory
cd platform
npm ci
npm run dev
```
Abrir `http://localhost:3000/admin/estoque`. O arquivo `platform/.env.local` deve continuar configurado localmente e não deve ser publicado.
