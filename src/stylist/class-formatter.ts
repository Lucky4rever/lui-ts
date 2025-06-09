import { ProcessedValue } from "../processor/processed-value";

export type ClassFormatter = (value: ProcessedValue) => string;

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

const validateType = (condition: string): string => {
  const match = condition.match(/min-width:\s*(\d+)(px|%|rem|em|vw|vh|vmin|vmax|pc|cm|mm|in|pt)?/i);
  if (!match) return '';
  
  const value = match[1];
  const unit = match[2]?.toLowerCase() || '';
  
  let unitSuffix = '';
  if (unit === '%') {
    unitSuffix = 'p';
  } else if (unit && unit !== 'px') {
    unitSuffix = unit;
  }
  
  return `${value}${unitSuffix}`;
}

export const minimalisticClassFormatter: ClassFormatter = (value) => {
  const parts = value.property.split('-');
  const prefix = parts.map(part => part.charAt(0)).join('');
  const suffix = value.optionalName
    ?.replace(/[EeYyUuIiOoAa]/g, '')
    ?? safeClassName(value.values.map(item => item.split(" ").join('-')).join('-') || 'none');

  let className = `.${prefix}_${suffix}`;
  
  if (value.pseudoClass) {
    className += `_${value.pseudoClass.replace(/:/g, '')[0]?.replace(/[EeYyUuIiOoAa]/g, '')}`;
  }

  if (value.media) {
    const mediaSuffix = validateType(value.media);
    className += `_m${mediaSuffix}`;
  }

  return className;
};

export const standardClassFormatter: ClassFormatter = (value) => {
  const parts = value.property.split('-');
  const prefix = parts.map(part => part.charAt(0)).join('');
  const suffix = value.optionalName 
    ?? safeClassName(value.values.map(item => item.split(" ").join('-')).join('-') || 'none');
  
  let className = `.${prefix}_${suffix}`;
  
  if (value.pseudoClass) {
    className += `_${value.pseudoClass.replace(/:/g, '')[0]}`;
  }
  
  if (value.media) {
    const mediaSuffix = validateType(value.media);
    className += `_m${mediaSuffix}`;
  }
  
  return className;
};

export const fullNamesClassFormatter: ClassFormatter = (value) => {
  const parts = value.property.split('-');
  const prefix = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const suffix = value.optionalName ?? safeClassName(value.values.map(item => item.split(" ").join('-')).join('-') || 'none');

  let className = `.${prefix}_${suffix}`;
  
  if (value.pseudoClass) {
    className += `_${value.pseudoClass.replace(/:/g, '')[0]}`;
  }
  
  if (value.media) {
    const mediaSuffix = validateType(value.media);
    className += `_media${mediaSuffix}`;
  }
  return className;
};

export const classNameFormatters = {
  'minimalistic': minimalisticClassFormatter,
  'standard': standardClassFormatter,
  'full-name': fullNamesClassFormatter,
} as const;

export type ClassNameFormatMode = keyof typeof classNameFormatters;

export const selectClassNameFormatter = (mode: ClassNameFormatMode): ClassFormatter => {
  const formatter = classNameFormatters[mode];

  if (!formatter) {
    throw new Error(`Class name formatter "${mode}" not found.`);
  }

  return formatter;
}
