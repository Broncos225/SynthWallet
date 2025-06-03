
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/contexts/app-data-context';

interface UseCurrencyInputProps {
  initialValue?: number;
  onChangeRHF?: (value: number | undefined) => void;
}

export const useCurrencyInput = ({ initialValue, onChangeRHF }: UseCurrencyInputProps) => {
  const { themeSettings } = useAppData();
  
  const getLocaleInfo = useCallback(() => {
    const locale = themeSettings?.numberFormatLocale || 'es-ES';
    const parts = new Intl.NumberFormat(locale, { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1}).formatToParts(1.1);
    const decimalSeparator = parts.find(part => part.type === 'decimal')?.value || '.';
    const groupSeparator = parts.find(part => part.type === 'group')?.value || (decimalSeparator === '.' ? ',' : '.');
    return { locale, decimalSeparator, groupSeparator };
  }, [themeSettings?.numberFormatLocale]);

  const formatNumberForDisplay = useCallback((num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return '';
    const { locale } = getLocaleInfo();
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }, [getLocaleInfo]);

  const [displayValue, setDisplayValue] = useState<string>(formatNumberForDisplay(initialValue));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumberForDisplay(initialValue));
    }
  }, [initialValue, isFocused, formatNumberForDisplay]);

  const parseInputToNumber = useCallback((val: string): number | undefined => {
    if (val === null || val === undefined || val.trim() === '') return undefined;
    const { decimalSeparator, groupSeparator } = getLocaleInfo();
    
    // Remove group separators
    const cleanedVal = val.split(groupSeparator).join('');
    // Replace locale decimal separator with a period for parseFloat
    const parsableVal = cleanedVal.replace(decimalSeparator, '.');

    const num = parseFloat(parsableVal);
    return isNaN(num) ? undefined : num;
  }, [getLocaleInfo]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = event.target.value;
    const { decimalSeparator } = getLocaleInfo();

    // Allow only digits and one instance of the decimal separator
    let regex;
    if (decimalSeparator === '.') {
        regex = /[^0-9.]/g;
    } else {
        regex = new RegExp(`[^0-9${decimalSeparator}]`, 'g');
    }
    
    let sanitizedValue = inputValue.replace(regex, (match) => {
        // Allow the first decimal separator, remove subsequent ones
        if (match === decimalSeparator && !inputValue.slice(0, inputValue.indexOf(match)).includes(decimalSeparator)) {
            return match;
        }
        return '';
    });

    // Ensure only one decimal separator
    const parts = sanitizedValue.split(decimalSeparator);
    if (parts.length > 2) {
        sanitizedValue = parts[0] + decimalSeparator + parts.slice(1).join('');
    }
    
    setDisplayValue(sanitizedValue);
    const numericValue = parseInputToNumber(sanitizedValue);
    
    if (onChangeRHF) {
      onChangeRHF(numericValue);
    }
  }, [parseInputToNumber, onChangeRHF, getLocaleInfo]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    const numericValue = parseInputToNumber(displayValue);
    if (numericValue !== undefined) {
      // Show raw number (or with locale decimal) for editing
      const { decimalSeparator } = getLocaleInfo();
      setDisplayValue(numericValue.toFixed(2).replace('.', decimalSeparator));
    } else {
      setDisplayValue('');
    }
  }, [displayValue, parseInputToNumber, getLocaleInfo]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const numericValue = parseInputToNumber(event.target.value);
    setDisplayValue(formatNumberForDisplay(numericValue));
    // RHF already updated via onChange
  }, [parseInputToNumber, formatNumberForDisplay]);
  
  const getPlaceholder = () => {
    const { locale } = getLocaleInfo();
     return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return {
    inputProps: {
      value: displayValue, // displayValue is always a string
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      type: 'text',
      inputMode: 'decimal',
      autoComplete: 'off',
      placeholder: getPlaceholder(),
    },
  };
};
