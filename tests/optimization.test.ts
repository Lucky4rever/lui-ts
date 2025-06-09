import { describe, it, expect } from 'vitest';
import CssStylist from '../src/stylist/css-stylist';
import { ProcessedValue } from '../src/processor/processed-value';
import { TokenValue } from '../src/tokenizer/token-value';
import Tokenizer from '../src/tokenizer/tokenizer';
import Parser from '../src/processor/parser';
import store from '../src/store/store';
import { randomInt } from 'node:crypto';

const parser = new Parser(store);

describe('CSS Optimization', () => {
  it('should deduplicate identical rules', () => {
    function generateSameInput(lines: number): TokenValue[] {
      let input: TokenValue[] = [];
      const tokenizer = new Tokenizer();
      for (let i = 0; i < lines; i++) {
        input.push(...tokenizer.tokenize('ADD margin 100px\n'));
      }
      return input;
    }

    const tokens = generateSameInput(100);
    const parsedValues = parser.parse(tokens);
    
    expect(parsedValues.length).toBe(1);
  });

  it('should combine media queries', () => {
    function generateSameInput(lines: number): TokenValue[] {
      let input: TokenValue[] = [];
      const tokenizer = new Tokenizer();
      for (let i = 0; i < lines + 1; i++) {
        input.push(...tokenizer.tokenize(`ADD padding @768px ${i}0px\n`));
      }
      return input;
    }
    const tokens = generateSameInput(50);
    const parsedValues = parser.parse(tokens);
    const uniqueMedia = Array.from(
      new Set(parsedValues.map(o => o.media).filter((m): m is string => m !== undefined))
    );

    const stylist = new CssStylist({ processedValues: parsedValues, classNameFormat: 'standard' });
    const css = stylist.generateCss();

    expect(uniqueMedia.length).toBe(1);
    
    for (let i = 0; i < 50; i++) {
      expect(css).toContain(`.p_${i}0px`);
    }
  });

  it('should minimize class names in minimalistic mode', () => {
    const longValue: ProcessedValue = {
      property: 'background-color',
      values: ['rgba(255, 255, 255, 0.5)']
    };
    
    const stylist = new CssStylist({
      processedValues: [longValue],
      classNameFormat: 'minimalistic',
      mode: 'minimalistic'
    });
    
    const css = stylist.generateCss();
    
    expect(css).toMatch(/\.bc_[a-z0-9{}]/);
  });
});