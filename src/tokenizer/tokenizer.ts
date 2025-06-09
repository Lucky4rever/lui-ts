import { PSEUDO_CLASSES_SET, PseudoClass } from "../consts/css-seudo-classes";
import { CSS_VALUES_SET, CssValue } from "../consts/css-values";
import { IDENTIFIERS_SET, Identifier } from "../consts/identifiers";
import { KEYWORDS_SET, Keyword } from "../consts/keywords";
import { PROPERTIES_SET, Property } from "../consts/token-property";
import { ValueType, VALUE_TYPES_SET } from "../consts/value-types";
import { TokenValue } from "./token-value";

class Tokenizer {
  private current = 0;
  private line = 1;
  private column = 1;
  private input: string = '';

  constructor(private tokens: TokenValue[] = []) {}

  tokenize(input: string): TokenValue[] {
    this.input = input;
    this.current = 0;
    this.line = 1;
    this.column = 1;
    
    while (this.current < this.input.length) {
      const char = this.peek();
      
      if (this.isWhitespace(char)) {
        this.consume();
        continue;
      }
      
      if (char === '/' && this.peekNext() === '/') {
        if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1]?.key === 'EQUALS') {
          while (this.isWhitespace(this.peek())) {
            this.consume();
          }
          if (this.peek() === '/' && this.peekNext() === '/') {
            throw this.error('Очікувалось значення після =');
          }
          this.tokens.push(this.parseValueAfterEquals());
        }
        this.tokens.push(this.parseComment());
        continue;
      }

      if (char === '-' && this.isDigit(this.peekNext())) {
        this.tokens.push(this.parseNumber());
        continue;
      }
      
      if (char === '\n') {
        this.tokens.push({ key: "NEWLINE" });
        this.consume();
        this.line++;
        this.column = 1;
        continue;
      }

      if (char === 'L' && this.input.startsWith('LAYER ', this.current)) {
        this.tokens.push(this.parseLayerMarker());
        continue;
      }

      if (char === '@') {
        this.tokens.push(this.parseMediaQuery());
        continue;
      }
      
      if (char === '$') {
        this.tokens.push(this.parseIdentifier());
        continue;
      }

      if (char === ':') {
        this.tokens.push(this.parsePseudoClass());
        continue;
      }

      if (this.isDigit(char) || 
        (char === '.' && this.isDigit(this.peekNext())) ||
        (char === '/' && this.isDigit(this.peekNext()))) {
        this.tokens.push(this.parseNumber());
        continue;
      }
      
      if (this.isLetter(char)) {
        const token = this.parseWord();
        this.tokens.push(token);
        continue;
      }
      
      if (char === '%') {
        this.tokens.push({ key: "VALUE_TYPE", value: "%" });
        this.consume();
        continue;
      }
      
      if (char === '{') {
        this.tokens.push(this.parseVariableReference());
        continue;
      }
      
      if (char === '#') {
        this.tokens.push(this.parseColor());
        continue;
      }
      
      if (char === '=') {
        this.tokens.push(this.parseSymbol());
        if (!this.isAtEnd()) {
          while (this.isWhitespace(this.peek())) {
            this.consume();
          }
          if (!this.isAtEnd() && !(this.peek() === '/' && this.peekNext() === '/')) {
            this.tokens.push(this.parseValueAfterEquals());
          }
        }
        continue;
      }
      
      this.tokens.push(this.parseSymbol());
    }
    
    return this.tokens;
  }

  private parseValueAfterEquals(): TokenValue {
    const char = this.peek();
    
    if (char === '{') {
      return this.parseVariableReference();
    }
    
    if (char === '#') {
      return this.parseColor();
    }
    
    if (this.isDigit(char)) {
      return this.parseNumber();
    }
    
    if (this.isLetter(char) || char === "'") {
      let value = '';
      
      while (this.isLetter(this.peek()) || this.peek() === "'") {
        value += this.consume();
      }
      
      if (VALUE_TYPES_SET.has(value as ValueType | never)) {
        while (this.isWhitespace(this.peek())) {
          this.consume();
        }
        
        if (this.peek() === '{') {
          const refToken = this.parseVariableReference();

          if (refToken.key !== 'VALUE')  throw this.error(`Expected variable reference after type ${value}`);

          return {
            key: 'VARIABLE_REF',
            ref: refToken.value.toString(),
            type: value as ValueType
          };
        } else {
          throw this.error(`Expected variable reference after type ${value}`);
        }
      } else {
        return { key: "VALUE", value };
      }
    }
    
    throw this.error(`Unexpected character after '=': ${char}`);
  }

  private parseComment(): TokenValue {
    this.consume();
    this.consume();
    
    const isPublic = this.peek() === '*';
    if (isPublic) {
      this.consume();
    }
    
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.consume();
    }
    
    return { 
      key: "COMMENT",
      type: isPublic ? "PUBLIC" : "PRIVATE",
      value: value.trim()
    };
  }

  private parseLayerMarker(): TokenValue {
    this.advance('LAYER '.length);
    
    let name = '';
    while (!this.isAtEnd() && !this.isWhitespace(this.peek()) && this.peek() !== '\n') {
      name += this.consume();
    }
    
    while (this.isWhitespace(this.peek())) {
      this.consume();
    }
    
    let action = '';
    while (!this.isAtEnd() && !this.isWhitespace(this.peek()) && this.peek() !== '\n') {
      action += this.consume();
    }
    
    if (action !== 'START' && action !== 'END') {
      throw this.error(`Невідома дія для LAYER: ${action}`);
    }
    
    if (this.peek() === '\n') {
      this.consume();
    }
    
    return {
      key: 'LAYER',
      name,
      action: action as 'START' | 'END'
    };
  }

  private parseColor(): TokenValue {
    this.consume();
    let value = '';
    
    const hexChars = /[0-9a-fA-F]/; // HEX can be 3, 6 or 8 characters
    while (hexChars.test(this.peek() ?? "") && value.length < 8) {
      value += this.consume();
    }
    
    return { key: "VALUE", value: `#${value}` };
  }

  private parseNumber(): TokenValue {
    let value = '';
    let hasFraction = false;
    let hasDecimal = false;
    let hasNegativeSign = false;

    if (this.peek() === '-' && this.isDigit(this.peekNext())) {
      hasNegativeSign = true;
      value += this.consume();
    }

    while (this.isDigit(this.peek())) {
      value += this.consume();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      hasDecimal = true;
      value += this.consume();
      while (this.isDigit(this.peek())) {
        value += this.consume();
      }
    } else if (this.peek() === '/' && this.isDigit(this.peekNext())) {
      hasFraction = true;
      value += this.consume();
      while (this.isDigit(this.peek())) {
        value += this.consume();
      }
    }

    let unit = '';
    while (this.isLetter(this.peek())) {
      unit += this.consume();
    }

    const fullValue = value + unit;

    if (unit) {
      return { key: "VALUE", value: fullValue };
    } else if (hasFraction || hasDecimal) {
      return { key: "VALUE", value: fullValue };
    } else {
      return { key: "VALUE", value: Number(value) };
    }
  }
  
  private parseMediaQuery(): TokenValue {
    this.consume(); // '@'
    let value = '';
    
    if (this.peek() === '{') {
      this.consume(); // '{'
      while (!this.isAtEnd() && this.peek() !== '}') {
        value += this.consume();
      }
      if (this.peek() === '}') this.consume();
      return { key: "MEDIA_VARIABLE_REF", ref: value };
    }
    
    while (!this.isAtEnd() && !this.isWhitespace(this.peek())) {
      value += this.consume();
    }
    
    return { key: "MEDIA_VALUE", value };
  }

  private parseIdentifier(): TokenValue {
    this.consume();
    let value = '';
    
    while (this.isIdentifierChar(this.peek()) && !this.isAtEnd()) {
      value += this.consume();
    }
    
    if (IDENTIFIERS_SET.has(value as Identifier | never)) {
      return { key: "IDENTIFIER", value: value as Identifier };
    }
    
    throw this.error(`Невідомий ідентифікатор: $${value}`);
  }

  private parsePseudoClass(): TokenValue {
    this.consume();
    let value = '';
    let depth = 0;

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === '(') {
        depth++;
        value += this.consume();
      } else if (char === ')') {
        if (depth === 0) break;
        depth--;
        value += this.consume();
      } else if (depth > 0 || this.isPseudoClass(char)) {
        value += this.consume();
      } else {
        break;
      }
    }

    if (PSEUDO_CLASSES_SET.has(value as PseudoClass | never)) {
      return { key: "PSEUDO_CLASS", value: `:${value}` as PseudoClass };
    }

    throw this.error(`Невідомий псевдоклас: :${value}`);
}

  private parseWord(): TokenValue {
    let value = '';
    
    while (this.isLetter(this.peek()) && !this.isAtEnd()) {
      value += this.consume();
    }
    
    if (KEYWORDS_SET.has(value as Keyword | never)) {
      return { key: "KEYWORD", value: value as Keyword };
    }

    if (CSS_VALUES_SET.has(value as CssValue | never) && this.tokens.at(-1)?.key !== "KEYWORD") {
      return { key: 'VALUE', value };
    }

    const lastKeyword = this.tokens.findLast(token => token.key === "KEYWORD");
    if (lastKeyword) {
      const lastKeywordIndex = this.tokens.lastIndexOf(lastKeyword);
      if (this.tokens.length === lastKeywordIndex + 1 && this.tokens[lastKeywordIndex]?.key === "KEYWORD" && lastKeyword.value === "VAR") {
        return { key: "VARIABLE", value: value };
      }
      
      if (PROPERTIES_SET.has(value as Property | never) && this.tokens[lastKeywordIndex + 1]?.key !== "PROPERTY") {
        return { key: "PROPERTY", value: value as Property };
      }
    }
    
    return { key: "VARIABLE", value };
  }

  private parseVariableReference(): TokenValue {
    this.consume();
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== '}') {
      value += this.consume();
    }
    
    if (this.isAtEnd())  throw this.error('Unexpected end of input while parsing variable reference');
    
    this.consume();
    
    let type: ValueType | undefined;
    if (this.isLetter(this.peek())) {
      let typeValue = '';
      
      while (this.isLetter(this.peek())) {
        typeValue += this.consume();
      }
      
      if (VALUE_TYPES_SET.has(typeValue as ValueType | never)) {
        type = typeValue as ValueType;
      } else {
        throw this.error(`Неправильний тип: ${typeValue}`);
      }
    }
    
    return { key: "VARIABLE_REF", ref: value, type };
  }

  private parseSymbol(): TokenValue {
    const char = this.consume();
    
    switch (char) {
      case '{': return { key: "LEFT_BRACE" };
      case '}': return { key: "RIGHT_BRACE" };
      case '[': return { key: "LEFT_BRACKET" };
      case ']': return { key: "RIGHT_BRACKET" };
      case ',': return { key: "VALUE", value: ',' };
      case '=': return { key: "EQUALS" };
      default: return { key: "UNKNOWN" };
    }
  }

  private isWhitespace(char: string | undefined): boolean {
    return char ? /\s/.test(char) && char !== '\n' : false;
  }

  private isLetter(char: string | undefined): boolean {
    return char ? /^[a-zA-Z0-9_@-]+$/.test(char) : false;
  }

  private isDigit(char: string | undefined): boolean {
    return char ? /[0-9]/.test(char) : false;
  }

  private isIdentifierChar(char: string | undefined): boolean {
    return char ? /[a-zA-Z0-9_-]/.test(char) : false;
  }

  private isPseudoClass(char: string | undefined): boolean {
    return char ? /[a-zA-Z0-9-:]/.test(char) : false;
  }

  private peek(): string | undefined {
    return this.input[this.current];
  }

  private peekNext(): string | undefined {
    if (this.current + 1 >= this.input.length) return '\0';
    return this.input[this.current + 1];
  }

  private consume(): string | undefined {
    const char = this.input[this.current++];
    this.column++;
    return char;
  }

  private advance(n: number): void {
    this.current += n;
    this.column += n;
  }

  private isAtEnd(): boolean {
    return this.current >= this.input.length;
  }

  private error(message: string): Error {
    return new Error(`${message} (${this.line}:${this.column})`);
  }
}

export default Tokenizer;