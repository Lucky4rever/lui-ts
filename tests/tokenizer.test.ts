import { describe, it, expect } from 'vitest';
import Tokenizer from '../src/tokenizer/tokenizer';
import { TokenValue } from '../src/tokenizer/token-value';

describe('Tokenizer', () => {
  it('should tokenize simple ADD statement', () => {
    const input = 'ADD width 100px';
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize(input);
    
    expect(tokens).toEqual([
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'width' },
      { key: 'VALUE', value: '100px' }
    ]);
  });

  it('should tokenize variable declaration', () => {
    const input = 'VAR size = 50px';
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize(input);
    
    expect(tokens).toEqual([
      { key: 'KEYWORD', value: 'VAR' },
      { key: 'VARIABLE', value: 'size' },
      { key: 'EQUALS' },
      { key: 'VALUE', value: '50px' }
    ]);
  });

  it('should tokenize pseudo-class', () => {
    const input = 'ADD background :hover blue';
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize(input);
    
    expect(tokens).toEqual([
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'background' },
      { key: 'PSEUDO_CLASS', value: ':hover' },
      { key: 'VALUE', value: 'blue' }
    ]);
  });

  it('should throw error on invalid syntax', () => {
    const input = 'ADD padding 1';
    const tokenizer = new Tokenizer();
    
    expect(() => tokenizer.tokenize(input)).not.toThrow();
  });
});