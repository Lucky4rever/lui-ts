const KEYWORDS = [
  'ADD',
  'IMPORT',
  'VAR',
  'LAYER',
  'TEMPLATE'
] as const;

export type Keyword = typeof KEYWORDS[number];
export const KEYWORDS_SET = new Set(KEYWORDS);
