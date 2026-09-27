// Port of lib/core/utils/currency_formatter.dart — es_CO / COP, no decimals,
// e.g. formatCurrency(150000) === "$150.000".
const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return formatCurrency(amount);
}

export function formatDiscount(pct: number): string {
  return `-${pct}%`;
}

export function applyDiscount(price: number, pct: number): number {
  return price * (1 - pct / 100);
}
