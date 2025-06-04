
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  format, 
  parseISO, 
  isValid as dateFnsIsValid, // Renamed to avoid conflict if isValid is used elsewhere
  addDays, 
  addWeeks, 
  addMonths, 
  addYears,
  startOfDay,
  isBefore,
  isEqual,
  formatISO
} from "date-fns";
import { es } from 'date-fns/locale';
import { DEFAULT_CURRENCY } from "./constants"; 
import type { RecurringTransaction } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date, dateFormat: string = 'd MMM yyyy'): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!dateFnsIsValid(date)) throw new Error('Invalid date object'); // Use renamed import
    return format(date, dateFormat, { locale: es });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Fecha Inválida";
  }
}

export function getMonthYear(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!dateFnsIsValid(date)) throw new Error('Invalid date string'); // Use renamed import
    return format(date, 'yyyy-MM', { locale: es });
  } catch (error) {
    return format(new Date(), 'yyyy-MM', { locale: es }); // fallback to current month
  }
}

export function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Color conversion functions
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const componentToHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hslStringToHex(hslString: string | undefined | null): string {
  if (!hslString) return '#000000'; // Default for invalid input or to ensure input[type=color] has a value
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return '#000000';
  const h = parseInt(match[1], 10) / 360;
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;
  const [rVal, gVal, bVal] = hslToRgb(h, s, l);
  return rgbToHex(rVal, gVal, bVal);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s: number, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToHslString(hex: string | undefined | null): string {
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) return "0 0% 0%"; // Default HSL for invalid/empty hex
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";
  const { h, s, l } = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return `${h} ${s}% ${l}%`;
}

export function calculateNextDueDate(
  startDateIso: string,
  frequency: RecurringTransaction['frequency'],
  lastProcessedDateIso?: string | null
): string {
  let currentDate = startOfDay(new Date());
  let baseDate = startOfDay(parseISO(startDateIso));

  if (lastProcessedDateIso) {
    baseDate = startOfDay(parseISO(lastProcessedDateIso));
  }

  let nextDueDate: Date;

  switch (frequency) {
    case 'daily':
      nextDueDate = addDays(baseDate, 1);
      break;
    case 'weekly':
      nextDueDate = addWeeks(baseDate, 1);
      break;
    case 'bi-weekly':
      nextDueDate = addWeeks(baseDate, 2);
      break;
    case 'monthly':
      nextDueDate = addMonths(baseDate, 1);
      break;
    case 'yearly':
      nextDueDate = addYears(baseDate, 1);
      break;
    default:
      // This should ideally not happen if types are correct
      console.error(`Unknown frequency: ${frequency}`);
      // Fallback to adding one month from the later of startDate or lastProcessedDate
      const latestBase = lastProcessedDateIso ? (parseISO(lastProcessedDateIso) > parseISO(startDateIso) ? parseISO(lastProcessedDateIso) : parseISO(startDateIso)) : parseISO(startDateIso);
      nextDueDate = addMonths(startOfDay(latestBase),1);
      break;
  }

  // Ensure nextDueDate is always in the future relative to the current date
  // and also strictly after the lastProcessedDate if provided
  const effectiveLastProcessed = lastProcessedDateIso ? startOfDay(parseISO(lastProcessedDateIso)) : null;

  while (isBefore(nextDueDate, currentDate) || isEqual(nextDueDate, currentDate) || (effectiveLastProcessed && (isBefore(nextDueDate, effectiveLastProcessed) || isEqual(nextDueDate, effectiveLastProcessed)))) {
      switch (frequency) {
          case 'daily': nextDueDate = addDays(nextDueDate, 1); break;
          case 'weekly': nextDueDate = addWeeks(nextDueDate, 1); break;
          case 'bi-weekly': nextDueDate = addWeeks(nextDueDate, 2); break;
          case 'monthly': nextDueDate = addMonths(nextDueDate, 1); break;
          case 'yearly': nextDueDate = addYears(nextDueDate, 1); break;
          default: // Fallback for unknown frequency, advance by one month to avoid infinite loop
            nextDueDate = addMonths(nextDueDate, 1);
            break;
      }
  }
  return formatISO(nextDueDate, { representation: 'date' });
}

export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD") // Decompose combined graphemes into base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritical marks
}
