import { ProcessedValue } from "../processor/processed-value";

export type ClassFormatter = (value: ProcessedValue) => string;

const PERCENTAGE_VALUES = new Set(['%', 'pct', 'percent']);
const SPECIAL_CHARACTERS = new Set(['#', '(', ')', ',', '.', '/']);

const safeClassName = (str: string): string => {
  let result = '';
  for (const char of str) {
    if (SPECIAL_CHARACTERS.has(char)) {
      continue;
    }
    result += char === '%' ? 'p' : char;
  }
  return result;
};

export const minimalisticClassFormatter: ClassFormatter = (value) => {
  const parts = value.property.split('-');
  const prefix = parts.map(part => part.charAt(0)).join('');
  const suffix = safeClassName(value.values.map(item => item.split(" ").join('-')).join('-') || 'none');
  return `.${prefix}-${suffix}`;
};

export const fullNamesClassFormatter: ClassFormatter = (value) => {
  const parts = value.property.split('-');
  const prefix = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const suffix = safeClassName(value.values.map(item => item.split(" ").join('-')).join('-') || 'none');
  return `.${prefix}-${suffix}`;
};

export const bootstrapClassFormatter: ClassFormatter = (value) => {
  const prefixMap = new Map([
    ['padding', 'p'],
    ['margin', 'm'],
    ['border', 'b'],
    ['width', 'w'],
    ['height', 'h']
  ]);

  let prefix = value.property[0];
  for (const [key, val] of prefixMap) {
    if (value.property.startsWith(key)) {
      prefix = val;
      break;
    }
  }

  const suffix = PERCENTAGE_VALUES.has(value.values.join('-') || 'none') ? 
    value.values.join('-') || 'none'.replace('%', '') : 
    safeClassName(value.values.join('-') || 'none');

  return `.${prefix}-${suffix}`;
};

export const classNameFormatters = {
  'minimalistic': minimalisticClassFormatter,
  'full-name': fullNamesClassFormatter,
  'bootstrap': bootstrapClassFormatter,
} as const;

export type ClassNameFormatMode = keyof typeof classNameFormatters;

export const selectClassNameFormatter = (mode: ClassNameFormatMode): ClassFormatter => {
  const formatter = classNameFormatters[mode];

  if (!formatter) {
    throw new Error(`Class name formatter "${mode}" not found.`);
  }

  return formatter;
}