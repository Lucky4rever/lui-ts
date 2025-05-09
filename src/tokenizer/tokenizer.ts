import { IDENTIFIERS_SET, Identifier } from "../consts/identifiers";
import { KEYWORDS_SET, Keyword } from "../consts/keywords";
import { TOKEN_PROPERTIES_SET, TokenProperty } from "../consts/token-property";
import { ValueType, VALUE_TYPES_SET } from "../consts/value-types";
import { TokenValue } from "./token-value";

class Tokenizer {
  private current = 0;
  private line = 1;
  private column = 1;
  private input: string = '';

  tokenize(input: string): TokenValue[] {
    this.input = input;
    this.current = 0;
    this.line = 1;
    this.column = 1;
    
    const tokens: TokenValue[] = [];
    
    while (this.current < this.input.length) {
      const char = this.peek();
      
      if (this.isWhitespace(char)) {
        this.consume();
        continue;
      }
      
      // Обробка коментарів (починаються з //)
      if (char === '/' && this.peekNext() === '/') {
        // Перед коментарем може бути значення
        if (tokens.length > 0 && tokens[tokens.length - 1].key === 'EQUALS') {
          // Пропускаємо пробіли після EQUALS
          while (this.isWhitespace(this.peek())) {
            this.consume();
          }
          // Якщо після пробілів йде коментар, значить значення відсутнє
          if (this.peek() === '/' && this.peekNext() === '/') {
            throw this.error('Очікувалось значення після =');
          }
          // Парсимо значення
          tokens.push(this.parseValueAfterEquals());
        }
        tokens.push(this.parseComment());
        continue;
      }
      
      if (char === '\n') {
        tokens.push({ key: "NEWLINE" });
        this.consume();
        this.line++;
        this.column = 1;
        continue;
      }

      if (char === 'L' && this.input.startsWith('LAYER ', this.current)) {
        tokens.push(this.parseLayerMarker());
        continue;
      }
      
      if (char === '$') {
        tokens.push(this.parseIdentifier());
        continue;
      }
      
      if (this.isLetter(char)) {
        const token = this.parseWord();
        tokens.push(token);
        continue;
      }
      
      if (this.isDigit(char)) {
        tokens.push(this.parseNumber());
        continue;
      }
      
      if (char === '%') {
        tokens.push({ key: "VALUE_TYPE", value: "%" });
        this.consume();
        continue;
      }
      
      if (char === '{') {
        tokens.push(this.parseVariableReference());
        continue;
      }
      
      if (char === '#') {
        tokens.push(this.parseColor());
        continue;
      }
      
      if (char === '=') {
        tokens.push(this.parseSymbol());
        // Після EQUALS парсимо значення
        if (!this.isAtEnd()) {
          // Пропускаємо пробіли
          while (this.isWhitespace(this.peek())) {
            this.consume();
          }
          // Якщо не кінець і не коментар, парсимо значення
          if (!this.isAtEnd() && !(this.peek() === '/' && this.peekNext() === '/')) {
            tokens.push(this.parseValueAfterEquals());
          }
        }
        continue;
      }
      
      tokens.push(this.parseSymbol());
    }
    
    return tokens;
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
    
    if (this.isLetter(char)) {
      // Може бути звичайне слово або типізоване значення
      const startPos = this.current;
      let value = '';
      
      while (this.isLetter(this.peek())) {
        value += this.consume();
      }
      
      // Перевіряємо, чи це тип
      if (VALUE_TYPES_SET.has(value as ValueType)) {
        // Це тип, отже очікуємо значення після нього
        // Пропускаємо пробіли
        while (this.isWhitespace(this.peek())) {
          this.consume();
        }
        
        // Парсимо саме значення
        if (this.peek() === '{') {
          const refToken = this.parseVariableReference();
          return {
            key: 'VARIABLE_REF',
            //@ts-ignore
            ref: refToken.value,
            type: value as ValueType
          };
        } else {
          throw this.error(`Очікувалось посилання на змінну після типу ${value}`);
        }
      } else {
        // Це просто слово
        return { key: "VALUE", value };
      }
    }
    
    throw this.error(`Невідомий формат значення після =: ${char}`);
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
    this.advance('LAYER '.length); // Пропускаємо "LAYER "
    
    // Читаємо назву шару
    let name = '';
    while (!this.isAtEnd() && !this.isWhitespace(this.peek()) && this.peek() !== '\n') {
      name += this.consume();
    }
    
    // Пропускаємо пробіли між назвою і дією
    while (this.isWhitespace(this.peek())) {
      this.consume();
    }
    
    // Читаємо дію (START/END)
    let action = '';
    while (!this.isAtEnd() && !this.isWhitespace(this.peek()) && this.peek() !== '\n') {
      action += this.consume();
    }
    
    if (action !== 'START' && action !== 'END') {
      throw this.error(`Невідома дія для LAYER: ${action}`);
    }
    
    // Пропускаємо перехід на новий рядок після маркера
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
    this.consume(); // Skip #
    let value = '';
    
    // Hex color може бути 3 або 6 символів
    const hexChars = /[0-9a-fA-F]/;
    while (hexChars.test(this.peek() ?? "") && value.length < 6) {
      value += this.consume();
    }
    
    return { key: "VALUE", value: `#${value}` };
  }

  private parseNumber(): TokenValue {
    let value = '';
    
    // Спочатку збираємо всі цифри
    while (this.isDigit(this.peek())) {
      value += this.consume();
    }
    
    // Перевіряємо на дробову частину
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.consume(); // Consume .
      while (this.isDigit(this.peek())) {
        value += this.consume();
      }
    }
    
    // Потім збираємо всі літери (для одиниць виміру)
    while (this.isLetter(this.peek())) {
      value += this.consume();
    }
    
    // Спроба перетворити на число, якщо немає літер
    const numericValue = /[a-zA-Z]/.test(value) ? value : Number(value);
    
    return { key: "VALUE", value: numericValue };
  }

  // Решта методів залишаються без змін...
  private parseIdentifier(): TokenValue {
    this.consume(); // Skip $
    let value = '';
    
    while (this.isIdentifierChar(this.peek()) && !this.isAtEnd()) {
      value += this.consume();
    }
    
    if (IDENTIFIERS_SET.has(value as Identifier)) {
      return { key: "IDENTIFIER", value: value as Identifier };
    }
    
    throw this.error(`Невідомий ідентифікатор: $${value}`);
  }

  private parseWord(): TokenValue {
    let value = '';
    
    while (this.isLetter(this.peek()) && !this.isAtEnd()) {
      value += this.consume();
    }
    
    if (KEYWORDS_SET.has(value as Keyword)) {
      return { key: "KEYWORD", value: value as Keyword };
    }
    
    if (TOKEN_PROPERTIES_SET.has(value as TokenProperty)) {
      return { key: "PROPERTY", value: value as TokenProperty };
    }
    
    return { key: "VARIABLE", value };
  }

  private parseVariableReference(): TokenValue {
    this.consume(); // Skip {
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== '}') {
      value += this.consume();
    }
    
    if (this.isAtEnd()) {
      throw this.error('Незакрита дужка');
    }
    
    this.consume(); // Skip }
    
    let type: ValueType | undefined;
    if (this.isLetter(this.peek())) {
      let typeValue = '';
      
      while (this.isLetter(this.peek())) {
        typeValue += this.consume();
      }
      
      if (VALUE_TYPES_SET.has(typeValue as ValueType)) {
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
      case ',': return { key: "COMMA" };
      case '=': return { key: "EQUALS" };
      default: throw this.error(`Невідомий символ: ${char}`);
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