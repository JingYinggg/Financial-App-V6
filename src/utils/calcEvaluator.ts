/**
 * Robust Arithmetic Expression Evaluator & Multi-line Ledger Parser
 * Safely parses and evaluates arithmetic expressions with support for:
 * - Operators: +, -, *, /, ×, ÷, (, )
 * - Currency prefixes/suffixes: RM, USD, $, SGD, etc.
 * - Percentage: e.g. 5%
 * - Multi-line labelled entries: e.g. "MAE: 66.5 - 54.5"
 */

export interface ParsedCalcLine {
  id: string;
  raw: string;
  label: string;
  expression: string;
  result: number;
  rate?: number; // Extracted interest rate e.g. 4.28 from "(4.28%)"
  estimatedPrincipal?: number;
  isValid: boolean;
  error?: string;
}

export interface LedgerEvaluation {
  lines: ParsedCalcLine[];
  total: number;
  formattedTotal: string;
  estimatedPrincipal?: number;
  effectiveWeightedRate?: number;
}

/**
 * Tokenizes and safely evaluates an arithmetic math string using recursive descent.
 * Does NOT use dangerous `eval()` or `Function()`.
 */
export function evaluateMathExpression(exprStr: string): { result: number; isValid: boolean; error?: string } {
  if (!exprStr || !exprStr.trim()) {
    return { result: 0, isValid: false };
  }

  // 1. Clean and normalize
  let clean = exprStr
    .replace(/(?:RM|rm|Rm|USD|usd|SGD|sgd|\$|€|£|¥)/g, '') // remove currency symbols
    .replace(/,/g, '') // remove digit group commas (e.g. 1,000.50 -> 1000.50)
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim();

  // Convert percentages e.g. 5% -> (5/100) or *0.01
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

  // Convert 'x' or 'X' between numbers e.g. 2 x 4 -> 2 * 4
  clean = clean.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1 * $2');

  // Verify only allowed mathematical characters
  if (!/^[0-9+\-*/().\s]+$/.test(clean)) {
    return { result: 0, isValid: false, error: 'Invalid characters in formula' };
  }

  // 2. Tokenize
  const tokens: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const char = clean[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < clean.length && /[0-9.]/.test(clean[i])) {
        numStr += clean[i];
        i++;
      }
      tokens.push(numStr);
      continue;
    }
    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }
    i++;
  }

  if (tokens.length === 0) {
    return { result: 0, isValid: false };
  }

  // 3. Recursive descent parser
  let tokenIdx = 0;
  const peek = () => tokens[tokenIdx];
  const consume = () => tokens[tokenIdx++];

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const nextTerm = parseTerm();
      if (op === '+') {
        value += nextTerm;
      } else {
        value -= nextTerm;
      }
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const nextFactor = parseFactor();
      if (op === '*') {
        value *= nextFactor;
      } else {
        if (nextFactor === 0) {
          throw new Error('Division by zero');
        }
        value /= nextFactor;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const token = peek();
    if (token === '+') {
      consume();
      return parseFactor();
    }
    if (token === '-') {
      consume();
      return -parseFactor();
    }
    if (token === '(') {
      consume(); // consume '('
      const val = parseExpression();
      if (peek() === ')') {
        consume(); // consume ')'
      } else {
        throw new Error('Missing closing parenthesis');
      }
      return val;
    }

    const next = consume();
    const num = parseFloat(next);
    if (isNaN(num)) {
      throw new Error(`Unexpected token: ${next}`);
    }
    return num;
  }

  try {
    const val = parseExpression();
    if (tokenIdx < tokens.length) {
      return { result: 0, isValid: false, error: 'Extra characters at end of expression' };
    }
    if (isNaN(val) || !isFinite(val)) {
      return { result: 0, isValid: false, error: 'Arithmetic calculation error' };
    }
    // Round to 2 decimal places to avoid floating point precision issues (e.g. 0.1 + 0.2)
    const rounded = Math.round(val * 100) / 100;
    return { result: rounded, isValid: true };
  } catch (err: any) {
    return { result: 0, isValid: false, error: err.message || 'Syntax error' };
  }
}

/**
 * Parses a single raw ledger line into label + expression + evaluated result
 * Examples:
 * - "MAE: 66.5 - 54.5" -> label: "MAE", expr: "66.5 - 54.5", result: 12
 * - "Yi RYT: 9.48" -> label: "Yi RYT", expr: "9.48", result: 9.48
 * - "RYT: 64.91" -> label: "RYT", expr: "64.91", result: 64.91
 * - "Boost: 48.83 - 36.7" -> label: "Boost", expr: "48.83 - 36.7", result: 12.13
 * - "50 + 20" -> label: "", expr: "50 + 20", result: 70
 */
export function parseSingleLedgerLine(lineStr: string, lineId?: string): ParsedCalcLine {
  const raw = lineStr;
  const trimmed = lineStr.trim();

  if (!trimmed) {
    return {
      id: lineId || `line_${Math.random().toString(36).substring(2, 9)}`,
      raw,
      label: '',
      expression: '',
      result: 0,
      isValid: false
    };
  }

  let label = '';
  let expression = trimmed;

  const colonIdx = trimmed.indexOf(':');
  const equalsIdx = trimmed.indexOf('=');

  if (colonIdx !== -1) {
    label = trimmed.substring(0, colonIdx).trim();
    expression = trimmed.substring(colonIdx + 1).trim();
  } else if (equalsIdx !== -1) {
    label = trimmed.substring(0, equalsIdx).trim();
    expression = trimmed.substring(equalsIdx + 1).trim();
  } else {
    // Check if line matches "LabelName Numbers/Math" e.g. "MAE 66.5 - 54.5"
    const match = trimmed.match(/^([a-zA-Z\s\(\)#_-]+)\s+([\d\.\+\-\*\/×÷\(\)\sRM\$]+)$/);
    if (match && !/^(RM|USD|SGD|\$)$/i.test(match[1].trim())) {
      label = match[1].trim();
      expression = match[2].trim();
    }
  }

  const { result, isValid, error } = evaluateMathExpression(expression);

  // Extract interest rate from label if present, e.g. "MAE (4.28%)", "Boost(3.3%)", "Yi RYT (4%)", "FD @ 3.8%"
  let rate: number | undefined = undefined;
  const rateMatch = (label || '').match(/(\d+(?:\.\d+)?)\s*%/);
  if (rateMatch) {
    rate = parseFloat(rateMatch[1]);
  }

  let estimatedPrincipal: number | undefined = undefined;
  if (isValid && result > 0 && rate && rate > 0) {
    // Principal = (Monthly Return * 12) / (Rate / 100)
    estimatedPrincipal = Math.round((result * 12 / (rate / 100)) * 100) / 100;
  }

  return {
    id: lineId || `line_${Math.random().toString(36).substring(2, 9)}`,
    raw,
    label,
    expression,
    result: isValid ? result : 0,
    rate,
    estimatedPrincipal,
    isValid,
    error
  };
}

/**
 * Parses full multi-line calc notes text into list of line items and calculates overall sum and estimated principal
 */
export function parseLedgerText(notesText: string, fallbackAccountRate?: number): LedgerEvaluation {
  if (!notesText || !notesText.trim()) {
    return { lines: [], total: 0, formattedTotal: '0.00' };
  }

  const rawLines = notesText.split('\n');
  const lines: ParsedCalcLine[] = [];
  let total = 0;
  let totalCalculatedPrincipal = 0;
  let hasItemSpecificPrincipal = false;

  rawLines.forEach((lineStr, idx) => {
    if (!lineStr.trim() && rawLines.length > 1 && idx === rawLines.length - 1) {
      // trailing empty newline
      return;
    }
    const parsed = parseSingleLedgerLine(lineStr, `line_${idx}`);
    lines.push(parsed);
    if (parsed.isValid) {
      total += parsed.result;
      if (parsed.estimatedPrincipal && parsed.estimatedPrincipal > 0) {
        totalCalculatedPrincipal += parsed.estimatedPrincipal;
        hasItemSpecificPrincipal = true;
      }
    }
  });

  const roundedTotal = Math.round(total * 100) / 100;

  // If sub-lines didn't have explicit rates, but an account-level rate is provided
  let finalEstimatedPrincipal = hasItemSpecificPrincipal ? Math.round(totalCalculatedPrincipal * 100) / 100 : undefined;
  if (!finalEstimatedPrincipal && fallbackAccountRate && fallbackAccountRate > 0 && roundedTotal > 0) {
    finalEstimatedPrincipal = Math.round((roundedTotal * 12 / (fallbackAccountRate / 100)) * 100) / 100;
  }

  let effectiveWeightedRate: number | undefined = undefined;
  if (finalEstimatedPrincipal && finalEstimatedPrincipal > 0 && roundedTotal > 0) {
    effectiveWeightedRate = Math.round(((roundedTotal * 12) / finalEstimatedPrincipal) * 10000) / 100;
  }

  return {
    lines,
    total: roundedTotal,
    formattedTotal: roundedTotal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    estimatedPrincipal: finalEstimatedPrincipal,
    effectiveWeightedRate
  };
}

/**
 * Converts array of line items back into raw multi-line string
 */
export function stringifyLedgerLines(lines: { label: string; expression: string }[]): string {
  return lines
    .filter(l => l.label.trim() || l.expression.trim())
    .map(l => {
      const lbl = l.label.trim();
      const exp = l.expression.trim();
      if (lbl && exp) {
        return `${lbl}: ${exp}`;
      }
      if (exp) {
        return exp;
      }
      return lbl;
    })
    .join('\n');
}
