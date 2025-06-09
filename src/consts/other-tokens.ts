const OTHER_TOKENS = [
  'LEFT_BRACE',
  'RIGHT_BRACE',
  'LEFT_BRACKET',
  'RIGHT_BRACKET',
  'EQUALS',
  'NEWLINE',
] as const;

export type OtherToken = typeof OTHER_TOKENS[number];
export const OTHER_TOKENS_SET = new Set(OTHER_TOKENS);
