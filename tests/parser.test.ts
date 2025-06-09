import { describe, it, expect, beforeEach } from 'vitest';
import Parser from '../src/processor/parser';
import { Store } from '../src/store/store';
import { TokenValue } from '../src/tokenizer/token-value';

describe('Parser', () => {
  let store: Store;
  let parser: Parser;

  beforeEach(() => {
    store = new Store();
    parser = new Parser(store);
  });

  it('should parse simple ADD statement', () => {
    const tokens: TokenValue[] = [
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'width' },
      { key: 'VALUE', value: '100px' }
    ];
    
    const result = parser.parse(tokens);
    
    expect(result).toEqual([{
      property: 'width',
      values: ['100px']
    }]);
  });

  it('should handle variables', () => {
    // First declare variable
    const varTokens: TokenValue[] = [
      { key: 'KEYWORD', value: 'VAR' },
      { key: 'VARIABLE', value: 'size' },
      { key: 'EQUALS' },
      { key: 'VALUE', value: '50px' }
    ];
    parser.parse(varTokens);
    
    // Then use it
    const addTokens: TokenValue[] = [
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'width' },
      { key: 'VARIABLE_REF', ref: 'size' }
    ];
    
    const result = parser.parse(addTokens);
    
    expect(result).toEqual([{
      property: 'width',
      values: ['50px'],
      optionalName: 'size'
    }]);
  });

  it('should handle pseudo-classes', () => {
    const tokens: TokenValue[] = [
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'background' },
      { key: 'PSEUDO_CLASS', value: 'hover' },
      { key: 'VALUE', value: 'blue' }
    ];
    
    const result = parser.parse(tokens);
    
    expect(result).toEqual([{
      property: 'background',
      values: ['blue'],
      pseudoClass: 'hover'
    }]);
  });

  it('should throw error on invalid value', () => {
    const tokens: TokenValue[] = [
      { key: 'KEYWORD', value: 'ADD' },
      { key: 'PROPERTY', value: 'marding' as any }, // Misspelled property
      { key: 'VALUE', value: '1' }
    ];
    
    expect(() => parser.parse(tokens)).toThrow('Invalid property: marding');
  });
});