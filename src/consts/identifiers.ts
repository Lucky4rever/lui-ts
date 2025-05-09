const IDENTIFIER_INPUTS = [
  'none',
  'all',
  'left',
  'right',
  'top',
  'bottom',
  'inline',
  'block',
  'color',
  'center',
  'start',
  'end',
] as const;

export type Identifier = typeof IDENTIFIER_INPUTS[number];
export const IDENTIFIERS_SET = new Set(IDENTIFIER_INPUTS);
