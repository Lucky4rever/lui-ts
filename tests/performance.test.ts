import { describe, it, expect } from 'vitest';
import Tokenizer from '../src/tokenizer/tokenizer';
import Parser from '../src/processor/parser';
import { Store } from '../src/store/store';
import { Property } from '../src/consts/token-property';
import { randomInt } from 'crypto';

describe('Performance Testing', () => {
  function generateLargeInput(lines: number): string {
    let input = '';
    const validValues: Partial<Record<Property, string[]>> = {
      "width": ["10px", "20px", "30px", "40px", "50px", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"],
      "height": ["10px", "20px", "30px", "40px", "50px", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"],
      "margin": ["0", "auto", "5px", "10px", "15px", "20px", "25px", "30px"],
      "padding": ["0", "5px", "10px", "15px", "20px", "25px", "30px"],
      "top": ["0", "5px", "10px", "15px", "20px", "25px", "30px", "10%", "20%", "30%", "40%", "50%"],
      "bottom": ["0", "5px", "10px", "15px", "20px", "25px", "30px", "10%", "20%", "30%", "40%", "50%"],
      "left": ["0", "5px", "10px", "15px", "20px", "25px", "30px", "10%", "20%", "30%", "40%", "50%"],
      "right": ["0", "5px", "10px", "15px", "20px", "25px", "30px", "10%", "20%", "30%", "40%", "50%"],
      "color": ["red", "blue", "green", "black", "white", "gray", "yellow"],
      "background": ["red", "blue", "green", "black", "white", "gray", "yellow"],
      "border": ["1px solid black", "2px solid red", "3px dashed blue", "4px dotted green", "5px double yellow"]
    };
    
    const identifierValues = ["all", "left", "right", "top", "bottom"];

    const keys = Object.keys(validValues) as Property[];

    for (let i = 0; i < lines; i++) {
      const property = keys[randomInt(0, keys.length)]!!;
      const value = validValues[property]!![randomInt(0, validValues[property]!!.length)];
      const identifier = identifierValues[randomInt(0, identifierValues.length)];

      input += `ADD ${property} ${identifier} ${value}\n`;
    }

    return input;
  }

  it('should handle 1,000 lines efficiently', () => {
    const input = generateLargeInput(1000);
    const tokenizer = new Tokenizer();
    const store = new Store();
    const parser = new Parser(store);
    
    const startTokenize = performance.now();
    const tokens = tokenizer.tokenize(input);
    const tokenizeTime = performance.now() - startTokenize;
    
    const startParse = performance.now();
    parser.parse(tokens);
    const parseTime = performance.now() - startParse;
    
    console.log(`1,000 lines - Tokenize: ${tokenizeTime.toFixed(2)}ms, Parse: ${parseTime.toFixed(2)}ms`);
    
    expect(tokenizeTime).toBeLessThan(15);
    expect(parseTime).toBeLessThan(30);
  });

  it('should handle 10,000 lines efficiently', () => {
    const input = generateLargeInput(10000);
    const tokenizer = new Tokenizer();
    const store = new Store();
    const parser = new Parser(store);
    
    const startTokenize = performance.now();
    const tokens = tokenizer.tokenize(input);
    const tokenizeTime = performance.now() - startTokenize;
    
    const startParse = performance.now();
    parser.parse(tokens);
    const parseTime = performance.now() - startParse;
    
    console.log(`10,000 lines - Tokenize: ${tokenizeTime.toFixed(2)}ms, Parse: ${parseTime.toFixed(2)}ms`);
    
    expect(tokenizeTime).toBeLessThan(125);
    expect(parseTime).toBeLessThan(260);
  });
});