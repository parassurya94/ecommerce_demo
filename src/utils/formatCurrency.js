export function formatCurrency(value, currencyCode = 'USD') {
  const numericValue = Number(value ?? 0);
  const code = typeof currencyCode === 'string' ? currencyCode.toUpperCase() : 'USD';

  if (!Number.isFinite(numericValue)) {
    return `${code} 0.00`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch (error) {
    return `${code} ${numericValue.toFixed(2)}`;
  }
}
