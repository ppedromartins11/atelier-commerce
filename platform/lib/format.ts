export function money(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
}
export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
export function priceToCents(value: string): number {
  const number = Number(value.replace(',', '.'));
  const cents = Math.round(number * 100);
  if (!value.trim() || !Number.isFinite(number) || number < 0 || !Number.isSafeInteger(cents) || cents > 2147483647)
    throw new Error('Preço inválido.');
  return cents;
}
export function nonNegativeInt(value: string, label: string): number {
  const n = Number(value);
  if (!value.trim() || !Number.isSafeInteger(n) || n < 0) throw new Error(label + ' deve ser inteiro e não negativo.');
  return n;
}
