const VALUE_TYPE_INPUTS = [
  '%',
  'px',
  'em',
  'rem',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'mm',
  'cm',
  'in',
  'pt',
  'pc',
  'ch',
  'ex',
] as const;

export type ValueType = typeof VALUE_TYPE_INPUTS[number];
export const VALUE_TYPES_SET = new Set(VALUE_TYPE_INPUTS);
