
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

  const formatNumberForDisplay = useCallback((num: number): string => {
    const { locale } = getLocaleInfo();
    // No formatear 0 a "0,00" aquí, ya que queremos "" para displayValue si el número es 0.
    // Esta función solo se llamará para números distintos de cero.
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }, [getLocaleInfo]);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    const numericInitial = (typeof initialValue === 'number' && !isNaN(initialValue)) ? initialValue : undefined;
    if (numericInitial === undefined || numericInitial === 0) {
      return '';
    }
    return formatNumberForDisplay(numericInitial);
  });
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const numericInitial = (typeof initialValue === 'number' && !isNaN(initialValue)) ? initialValue : undefined;
      if (numericInitial === undefined || numericInitial === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatNumberForDisplay(numericInitial));
      }
    }
  }, [initialValue, isFocused, formatNumberForDisplay]);

  const parseInputToNumber = useCallback((val: string): number | undefined => {
    if (val === null || val === undefined || val.trim() === '') return undefined;
    const { decimalSeparator, groupSeparator } = getLocaleInfo();
    
    const cleanedVal = val.split(groupSeparator).join('');
    const parsableVal = cleanedVal.replace(decimalSeparator, '.');

    const num = parseFloat(parsableVal);
    return isNaN(num) ? undefined : num;
  }, [getLocaleInfo]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = event.target.value;
    const { decimalSeparator } = getLocaleInfo();

    let regex;
    const escapedDecimalSeparator = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`[^0-9${escapedDecimalSeparator}]`, 'g');
    
    let sanitizedValue = inputValue.replace(regex, (match, offset) => {
        if (match === decimalSeparator && inputValue.indexOf(decimalSeparator) === offset) {
            return match;
        }
        return '';
    });

    const parts = sanitizedValue.split(decimalSeparator);
    if (parts.length > 2) {
        sanitizedValue = parts[0] + decimalSeparator + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
        sanitizedValue = parts[0] + decimalSeparator + parts[1].substring(0, 2);
    }
    
    setDisplayValue(sanitizedValue); 

    const numericValue = parseInputToNumber(sanitizedValue);
    
    if (onChangeRHF) {
      onChangeRHF(numericValue); 
    }
  }, [parseInputToNumber, onChangeRHF, getLocaleInfo]);

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const numericValue = parseInputToNumber(event.target.value);
    if (numericValue === undefined || numericValue === 0) {
      setDisplayValue(''); 
    } else {
      const { decimalSeparator } = getLocaleInfo();
      setDisplayValue(numericValue.toFixed(2).replace('.', decimalSeparator));
    }
  }, [parseInputToNumber, getLocaleInfo]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const numericValue = parseInputToNumber(event.target.value); 
    if (numericValue === undefined || numericValue === 0) {
      setDisplayValue(''); 
      if (onChangeRHF) {
         onChangeRHF(undefined); // Asegurar que el estado numérico se actualice a 0 o undefined
      }
    } else {
      setDisplayValue(formatNumberForDisplay(numericValue));
      if (onChangeRHF) {
        onChangeRHF(numericValue);
      }
    }
  }, [parseInputToNumber, formatNumberForDisplay, onChangeRHF, getLocaleInfo]);
  
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
      value: displayValue,
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
