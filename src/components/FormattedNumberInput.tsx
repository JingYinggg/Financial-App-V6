import React, { useState, useEffect, useRef } from 'react';
import { formatWithCommas, parseCommaNumber } from '../utils/numberFormatting';

export interface FormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | undefined | null;
  onChange?: (value: number, raw: string) => void;
  onValueChange?: (value: number) => void;
  allowDecimals?: boolean;
  allowNegative?: boolean;
  maxDecimals?: number;
  formatOnBlurOnly?: boolean;
  showZeroAsBlank?: boolean;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  onValueChange,
  allowDecimals = true,
  allowNegative = true,
  maxDecimals = 4,
  formatOnBlurOnly = false,
  showZeroAsBlank = false,
  className = '',
  placeholder = '0',
  disabled,
  readOnly,
  onFocus,
  onBlur,
  onKeyDown,
  ...restProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to convert incoming prop value into formatted string
  const formatIncomingValue = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    if (showZeroAsBlank && (val === 0 || val === '0')) return '';
    if (typeof val === 'number') {
      return formatWithCommas(val);
    }
    return formatWithCommas(val);
  };

  const [displayValue, setDisplayValue] = useState<string>(() => formatIncomingValue(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync with prop changes when not being actively typed or when value diverges significantly
  useEffect(() => {
    const formatted = formatIncomingValue(value);
    if (!isFocused) {
      setDisplayValue(formatted);
    } else {
      // Check if external value changed to something completely different
      const currentParsed = parseCommaNumber(displayValue);
      const incomingParsed = typeof value === 'number' ? value : parseCommaNumber(value);
      if (Math.abs(currentParsed - incomingParsed) > 0.0001 && displayValue !== '-' && !displayValue.endsWith('.')) {
        setDisplayValue(formatted);
      }
    }
  }, [value, isFocused, showZeroAsBlank]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const inputElement = inputRef.current;
    const cursorPosition = inputElement?.selectionStart ?? raw.length;

    // Filter allowed characters: digits, comma, minus (if allowed), dot (if allowed)
    let filtered = raw.replace(/[^\d.,-]/g, '');

    if (!allowNegative) {
      filtered = filtered.replace(/-/g, '');
    } else {
      // Allow minus only at the start
      const isNeg = filtered.startsWith('-');
      filtered = (isNeg ? '-' : '') + filtered.replace(/-/g, '');
    }

    if (!allowDecimals) {
      filtered = filtered.replace(/\./g, '');
    } else {
      // Allow only single decimal point
      const dotIndex = filtered.indexOf('.');
      if (dotIndex !== -1) {
        const integerPart = filtered.slice(0, dotIndex);
        let decPart = filtered.slice(dotIndex + 1).replace(/\./g, '');
        if (maxDecimals !== undefined && decPart.length > maxDecimals) {
          decPart = decPart.slice(0, maxDecimals);
        }
        filtered = `${integerPart}.${decPart}`;
      }
    }

    // Handle special intermediate typing states
    if (filtered === '' || filtered === '-' || filtered === '.' || filtered === '-.') {
      setDisplayValue(filtered);
      const numVal = 0;
      onChange?.(numVal, filtered);
      onValueChange?.(numVal);
      return;
    }

    // Number of digits before the cursor in raw input
    const digitsBeforeCursor = raw.slice(0, cursorPosition).replace(/[^\d]/g, '').length;

    // Format with commas live
    const formatted = formatWithCommas(filtered);
    setDisplayValue(formatted);

    const numVal = parseCommaNumber(formatted);
    onChange?.(numVal, formatted);
    onValueChange?.(numVal);

    // Restore cursor position based on digit count
    if (inputElement) {
      requestAnimationFrame(() => {
        let newCursor = 0;
        let digitsCounted = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (digitsCounted === digitsBeforeCursor) {
            newCursor = i;
            break;
          }
          if (/\d/.test(formatted[i])) {
            digitsCounted++;
          }
          newCursor = i + 1;
        }
        inputElement.setSelectionRange(newCursor, newCursor);
      });
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // On blur, ensure clean number representation
    const num = parseCommaNumber(displayValue);
    if (displayValue === '' || (showZeroAsBlank && num === 0)) {
      setDisplayValue('');
      onChange?.(0, '');
      onValueChange?.(0);
    } else {
      const formatted = formatWithCommas(num);
      setDisplayValue(formatted);
      onChange?.(num, formatted);
      onValueChange?.(num);
    }
    onBlur?.(e);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      {...restProps}
    />
  );
};

export default FormattedNumberInput;
