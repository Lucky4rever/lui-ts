import { Identifier } from "../consts/identifiers";
import { Property, PROPERTIES_SET } from "../consts/properties";
import { TokenProperty } from "../consts/token-property";
import { Store } from "../store/store";
import { TokenValue } from "../tokenizer/token-value";
import { ProcessedValue } from "./processed-value";

function expandProperty(property: TokenProperty, identifier: Identifier): Property[] {
  if (identifier === "none") {
    return [property as Property];
  }
  
  const availableProperties = Array.from(PROPERTIES_SET).filter((p) => p.startsWith(property));

  if (identifier === "all") {
    return availableProperties;
  }

  const identifiedProperties = availableProperties.filter((p) => p.includes(identifier));

  return identifiedProperties;
}

class Parser {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  process(tokens: TokenValue[]): ProcessedValue[] {
    const processedValues: ProcessedValue[] = [];
    const groupedTokens = this.groupTokensByLine(tokens);

    for (const lineTokens of groupedTokens) {
      if (lineTokens.length === 0) continue;
      
      // Обробка токенів LAYER
      if (lineTokens[0]?.key === "LAYER") {
        processedValues.push({
          property: "LAYER",
          values: [lineTokens[0].name, lineTokens[0].action]
        });
        continue;
      }

      if (lineTokens[0] === undefined) continue;
      if (lineTokens[0].key === "NEWLINE") continue;
      if (lineTokens[0].key === "COMMENT" && lineTokens[0].type === "PRIVATE") continue;
      if (lineTokens[0].key === "COMMENT" && lineTokens[0].type === "PUBLIC") {
        processedValues.push(...this.processComment(lineTokens));
        continue;
      }

      processedValues.push(...this.processInlineTokens(lineTokens));
    }

    return this.removeDuplicates(processedValues);
  }

  private groupTokensByLine(tokens: TokenValue[]): TokenValue[][] {
    const grouped: TokenValue[][] = [];
    let currentLine: TokenValue[] = [];

    for (const token of tokens) {
      if (token.key === "NEWLINE") {
        if (currentLine.length > 0) {
          grouped.push(currentLine);
          currentLine = [];
        }
      } else if (token.key === "LAYER") {
        if (currentLine.length > 0) {
          grouped.push(currentLine);
          currentLine = [];
        }
        grouped.push([token]);
      } else {
        currentLine.push(token);
      }
    }

    if (currentLine.length > 0) {
      grouped.push(currentLine);
    }

    return grouped;
  }

  private processInlineTokens(tokens: TokenValue[]): ProcessedValue[] {
    const processedValues: ProcessedValue[] = [];

    const groupedTokensByKey = tokens.reduce((acc, token) => {
      if (!acc[token.key]) {
        acc[token.key] = [];
      }
      acc[token.key]?.push(token) ?? [];
      return acc;
    }, {} as Record<string, TokenValue[]>);

    const commentTokens = groupedTokensByKey["COMMENT"];
    if (commentTokens) {
      for (const commentToken of commentTokens) {
        if (commentToken.key !== "COMMENT") continue;
        processedValues.push({ property: "COMMENT", values: [commentToken.value] });
      }
    }
    
    const keywordTokens = groupedTokensByKey["KEYWORD"];
    if (!keywordTokens || keywordTokens[0]?.key !== "KEYWORD") throw new Error("Invalid line - no keyword found");
    if (keywordTokens.length > 1)  throw new Error("Invalid line - multiple keywords found");
    
    const keywordToken = keywordTokens[0];

    const keyword = keywordToken.value;
    const propertyTokens = groupedTokensByKey["PROPERTY"];
    const valueTokens = groupedTokensByKey["VALUE"];
    const identifierTokens = groupedTokensByKey["IDENTIFIER"];
    const variableTokens = groupedTokensByKey["VARIABLE"];
    const variableRefTokens = groupedTokensByKey["VARIABLE_REF"];

    switch (keyword) {
      case "ADD":
        const processedAdd = this.processAdd(propertyTokens, identifierTokens, valueTokens, variableTokens, variableRefTokens);
        processedValues.push(...processedAdd);
        break;
      
      case "IMPORT":
        break;

      case "VAR":
        const processedVar = this.processVar(variableTokens, valueTokens);
        processedValues.push(...processedVar);
        break;

      default:
        throw new Error(`Invalid keyword: ${keyword}`);
    }

    return processedValues;
  }

  private processAdd(
    propertyTokens: TokenValue[] | undefined,
    identifierTokens: TokenValue[] | undefined,
    valueTokens: TokenValue[] | undefined,
    variableTokens: TokenValue[] | undefined,
    variableRefTokens: TokenValue[] | undefined
  ): ProcessedValue[] {
    const processedValues: ProcessedValue[] = [];

    if (!propertyTokens || propertyTokens.length === 0) {
      throw new Error("ADD statement requires at least one property");
    }
  
    const propertyToken = propertyTokens[0];
    if (propertyToken?.key !== "PROPERTY") {
      throw new Error("Invalid property token in ADD statement");
    }
  
    const allValueTokens = [
      ...(valueTokens || []),
      ...(variableTokens?.map(token => {
        if (token.key === "VARIABLE") {
          return { key: 'VALUE', value: token.value } as TokenValue;
        }
        throw new Error(`Invalid token type in variableTokens: ${token.key}`);
      }) || []),
      ...(variableRefTokens || [])
    ];

    if (allValueTokens.length === 0) {
      throw new Error("ADD statement requires at least one value");
    }
  
    const values = allValueTokens.map(token => {
      if (token.key === "VALUE") {
        return this.resolveValue(token, undefined);
      } else if (token.key === "VARIABLE_REF") {
        return this.resolveVariableRef(token);
      }
      throw new Error(`Invalid value token type: ${token.key}`);
    });

    let expandedProperties: string[] = [];
  
    if (identifierTokens && identifierTokens.length > 0) {
      identifierTokens.forEach(identifierToken => {
        if (identifierToken.key !== "IDENTIFIER") {
          throw new Error("Invalid identifier token in ADD statement");
        }
        const identifier = identifierToken.value as Identifier;
        expandedProperties = [...expandedProperties, ...expandProperty(propertyToken.value, identifier)];
      });
    } else {
      expandedProperties = expandProperty(propertyToken.value, "none");
    }
  
  
    for (const property of expandedProperties) {
      processedValues.push({
        property,
        values: [...values]
      });
    }
  
    return processedValues;
  }
  
  getVariables() {
    return this.store.getVariables();
  }
  
  private resolveVariableRef(token: TokenValue): string {
    if (token.key !== "VARIABLE_REF") {
      throw new Error(`Invalid token type for variable reference: ${token.key}`);
    }

    const variable = this.store.getVariable(token.ref);
    if (!variable) {
      throw new Error(`Variable not found: ${token.ref}`);
    }
    return `${variable.value}${variable.type || ""}`;
  }
  
  private processVar(
    variableTokens: TokenValue[] | undefined,
    valueTokens: TokenValue[] | undefined
  ): ProcessedValue[] {
    if (!variableTokens || variableTokens.length === 0) {
      throw new Error("VAR statement requires a variable name");
    }
  
    if (!valueTokens || valueTokens.length === 0) {
      throw new Error("VAR statement requires a value");
    }
  
    const variableToken = variableTokens[0];
    if (variableToken?.key !== "VARIABLE") {
      throw new Error("Invalid variable token in VAR statement");
    }
  
    const valueToken = valueTokens[0];
    if (valueToken?.key !== "VALUE") {
      throw new Error("Invalid value token in VAR statement");
    }

    let valueTypeToken: TokenValue | undefined;
  
    if (valueTokens.length > 1 && valueTokens[1]?.key === "VALUE_TYPE") {
      valueTypeToken = valueTokens[1];
    }
  
    this.store.addVariable(
      variableToken.value,
      valueToken.value,
      valueTypeToken?.key === "VALUE_TYPE" ? valueTypeToken.value : undefined
    );
  
    return [];
  }

  private processComment(tokens: TokenValue[]): ProcessedValue[] {
    const commentToken = tokens[0];
    if (commentToken?.key !== "COMMENT") {
      throw new Error("Invalid comment token");
    }

    const commentValue = commentToken.value;
    return [{
      property: "COMMENT",
      values: [commentValue],
    }];
  }

  private resolveValue(valueToken: TokenValue, valueTypeToken?: TokenValue): string {
    let value = "";

    if (valueToken.key === "VALUE") {
      value = `${(valueToken as { value: string | number }).value}`;
    } else if (valueToken.key === "VARIABLE_REF") {
      const variable = this.store.getVariable(valueToken.ref);
      if (variable) {
        value = `${variable.value}${variable.type || ""}`;
      } else {
        throw new Error(`Variable not found: ${valueToken.ref}`);
      }
    } else {
      throw new Error(`Invalid value token: ${JSON.stringify(valueToken)}`);
    }

    if (valueTypeToken?.key === "VALUE_TYPE") {
      value += valueTypeToken.value;
    }

    return value;
  }

  private removeDuplicates(values: ProcessedValue[]): ProcessedValue[] {
    const uniqueValues: ProcessedValue[] = [];
    const seen = new Map<string, boolean>();

    for (const item of values) {
      if (item.property === 'LAYER') {
        uniqueValues.push(item);
        continue;
      }

      const key = `${item.property}:${JSON.stringify(item.values)}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueValues.push(item);
      }
    }

    return uniqueValues;
  }
}

export default Parser;