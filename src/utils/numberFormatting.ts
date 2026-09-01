/**
 * App-wide Number Formatting Utilities
 * Standardizes comma thousand separators (e.g. 1000000 -> 1,000,000)
 */

/**
 * Formats a raw number or numeric string with comma thousand separators.
 * Preserves decimal portions without rounding unless min/max decimals are specified.
 * 
 * Examples:
 * - 1000000 -> "1,000,000"
 * - 1234567.89 -> "1,234,567.89"
 * - "50000" -> "50,000"
 * - -2500.5 -> "-2,500.5"
 */
export function formatWithCommas(
  value: number | string | undefined | null,
  options?: {
    minDecimals?: number;
    maxDecimals?: number;
    fallback?: string;
  }
): string {
  if (value === undefined || value === null || value === '') {
    return options?.fallback ?? '';
  }

  const num = typeof value === 'string' ? parseCommaNumber(value) : value;

  if (isNaN(num)) {
    return options?.fallback ?? '';
  }

  if (options?.minDecimals !== undefined || options?.maxDecimals !== undefined) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: options.minDecimals ?? 0,
      maximumFractionDigits: options.maxDecimals ?? 2,
    });
  }

  // Raw string representation formatting preserving exact user decimals
  const str = typeof value === 'number' ? value.toString() : value.trim().replace(/,/g, '');
  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  const parts = cleanStr.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${isNegative ? '-' : ''}${formattedInteger}${decimalPart}`;
}

/**
 * Cleans comma-separated string back into a standard JS float.
 * E.g. "1,000,000.50" -> 1000000.5
 */
export function parseCommaNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to format currency with commas
 * E.g. 1000000, "RM" -> "RM 1,000,000.00"
 */
export function formatCurrencyCommas(
  val: number | undefined | null,
  currency: string = 'RM',
  decimals: number = 2
): string {
  const num = val || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${formatted}`;
}
