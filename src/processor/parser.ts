import { Identifier } from "../consts/identifiers";
import { Property, PROPERTIES_SET } from "../consts/token-property";
import { ValueType } from "../consts/value-types";
import { Store } from "../store/store";
import { TokenValue } from "../tokenizer/token-value";
import { ProcessedValue } from "./processed-value";

function expandProperty(property: Property, identifier: Identifier): Property[] {
  if (identifier === "base") {
    return [property as Property];
  }
  
  const availableProperties = Array.from(PROPERTIES_SET).filter((p) => p.startsWith(property));

  if (identifier === "all") {
    return availableProperties;
  }

  const identifiedProperties = availableProperties.filter((p) => p.substring(p.indexOf('-') + 1, p.length) === identifier);

  return identifiedProperties;
}

class Parser {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  parse(tokens: TokenValue[]): ProcessedValue[] {
    const parsedValues: ProcessedValue[] = [];
    const groupedTokens = this.groupTokensByLine(tokens);

    for (const lineTokens of groupedTokens) {
      if (lineTokens.length === 0) continue;
      
      // Обробка токенів LAYER
      if (lineTokens[0]?.key === "LAYER") {
        parsedValues.push({
          property: "LAYER",
          values: [lineTokens[0].name, lineTokens[0].action]
        });
        continue;
      }

      if (lineTokens[0] === undefined) continue;
      if (lineTokens[0].key === "NEWLINE") continue;

      parsedValues.push(...this.parseInlineTokens(lineTokens));
    }

    const parsedUniqueValues = this.removeDuplicates(parsedValues);
    const parsedNonEmptyValues = this.removeEmptyLayers(parsedUniqueValues);
    return parsedNonEmptyValues;
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

  private parseInlineTokens(tokens: TokenValue[]): ProcessedValue[] {
    const parsedValues: ProcessedValue[] = [];

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
        if (commentToken.type === "PRIVATE") continue;
        parsedValues.push({ property: "COMMENT", values: [commentToken.value] });
      }
    }
    if (tokens[0]?.key === "COMMENT")  return parsedValues;
    
    const keywordTokens = groupedTokensByKey["KEYWORD"];
    if (!keywordTokens || keywordTokens[0]?.key !== "KEYWORD") throw new Error(`Invalid line - no keyword found: ${JSON.stringify(tokens)}`);
    if (keywordTokens.length > 1)  throw new Error("Invalid line - multiple keywords found");
    
    const keywordToken = keywordTokens[0];

    const keyword = keywordToken.value;
    const propertyTokens = groupedTokensByKey["PROPERTY"];
    const valueTokens = groupedTokensByKey["VALUE"];
    const valueTypeTokens = groupedTokensByKey["VALUE_TYPE"];
    const identifierTokens = groupedTokensByKey["IDENTIFIER"];
    const pseudoClassTokens = groupedTokensByKey["PSEUDO_CLASS"];
    const variableTokens = groupedTokensByKey["VARIABLE"];
    const variableRefTokens = groupedTokensByKey["VARIABLE_REF"];
    const mediaValueTokens = groupedTokensByKey["MEDIA_VALUE"];
    const mediaRefTokens = groupedTokensByKey["MEDIA_VARIABLE_REF"];

    switch (keyword) {
      case "ADD":
        const parsedAdd = this.parseAdd(
          propertyTokens, 
          identifierTokens, 
          pseudoClassTokens, 
          mediaValueTokens,
          mediaRefTokens,
          valueTokens, 
          valueTypeTokens,
          variableTokens, 
          variableRefTokens
        );
        parsedValues.push(...parsedAdd);
        break;
      
      case "IMPORT":
        break;

      case "VAR":
        const parsedVar = this.parseVar(variableTokens, valueTokens);
        parsedValues.push(...parsedVar);
        break;

      default:
        throw new Error(`Invalid keyword: ${keyword}`);
    }

    return parsedValues;
  }

  private parseAdd(
    propertyTokens: TokenValue[] | undefined,
    identifierTokens: TokenValue[] | undefined,
    pseudoClassTokens: TokenValue[] | undefined,
    mediaValueTokens: TokenValue[] | undefined,
    mediaRefTokens: TokenValue[] | undefined,
    valueTokens: TokenValue[] | undefined,
    valueTypeTokens: TokenValue[] | undefined,
    variableTokens: TokenValue[] | undefined,
    variableRefTokens: TokenValue[] | undefined
): ProcessedValue[] {
  const parsedValues: ProcessedValue[] = [];

  if (!propertyTokens || propertyTokens.length === 0) {
    throw new Error("ADD statement requires at least one property");
  }

  const propertyToken = propertyTokens[0];
  if (propertyToken?.key !== "PROPERTY") {
    throw new Error("Invalid property token in ADD statement");
  }

  let mediaCondition: string | undefined;
  if (mediaValueTokens && mediaValueTokens.length > 0 && mediaValueTokens[0]!!.key === "MEDIA_VALUE") {
      mediaCondition = `(min-width: ${mediaValueTokens[0]!!.value})`;
  } else if (mediaRefTokens && mediaRefTokens.length > 0 && mediaRefTokens[0]!!.key === "MEDIA_VARIABLE_REF") {
    // @ts-ignore
    const varName = mediaRefTokens[0]!!.ref;
    const varValue = this.store.getVariable(varName);
    if (varValue) mediaCondition = `(min-width: ${varValue})`;
  }

  // Обробка псевдокласів
  const pseudoClassToken = pseudoClassTokens?.[0];
  if (pseudoClassToken && pseudoClassToken.key !== "PSEUDO_CLASS") {
    throw new Error("Invalid pseudo class token in ADD statement");
  }

  // Обробка значень
  let i = -1;

  const combinedValueTokens = valueTokens?.map(token => {
    if (token.key !== "VALUE" && token.key !== "VARIABLE_REF") {
      throw new Error(`Invalid value token type: ${token.key}`);
    }
    i++;
    if (valueTypeTokens?.[i]?.key !== "VALUE_TYPE") {
      return token;
    }
    if (token.key === "VALUE" && valueTypeTokens?.[i]?.key) {
      //@ts-ignore
      return { ...token, value: `${token.value}${valueTypeTokens?.[i].value ?? ''}` } as TokenValue;
    }
    throw new Error(`Invalid token type: ${token.key}`);
  }) || [];

  const allValueTokens = [
    ...combinedValueTokens,
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
      return token.value.toString();
    } else if (token.key === "VARIABLE_REF") {
      return this.resolveVariableRef(token);
    }
    throw new Error(`Invalid value token type: ${token.key}`);
  });

  // Розширення властивостей за ідентифікаторами
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
    expandedProperties = expandProperty(propertyToken.value, "base");
  }

  // Формування результату
  for (const expandedProperty of expandedProperties) {
    if (!PROPERTIES_SET.has(expandedProperty as Property)) {
      throw new Error(`Invalid property: ${expandedProperty}`);
    }

    //@ts-ignore
    const refNames = variableRefTokens?.map(t => t.ref) || [];
    parsedValues.push({
      property: expandedProperty as Property,
      values: [...values],
      optionalName: refNames.length > 0 ? refNames.join('-') : undefined,
      pseudoClass: pseudoClassToken ? pseudoClassToken.value : undefined,
      media: mediaCondition
    });
  }

  return parsedValues;
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

    if (/(px|rem|em|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ex|ch)$/.test(variable)) {
      return variable;
    }

    if (token.type) {
      return `${variable}${token.type}`;
    }

    return variable;
  }
  
  private parseVar(
    variableTokens: TokenValue[] | undefined,
    valueTokens: TokenValue[] | undefined
  ): ProcessedValue[] {
    if (!variableTokens || variableTokens.length === 0) {
      throw new Error("VAR statement requires a variable name");
    }
  
    if (!valueTokens || valueTokens.length === 0) {
      throw new Error("VAR statement requires values");
    }
  
    const variableToken = variableTokens[0];
    if (variableToken?.key !== "VARIABLE") {
      throw new Error("Invalid variable token in VAR statement");
    }
  
    const values: (string | number)[] = [];
    const types: (ValueType | undefined)[] = [];
  
    for (const token of valueTokens) {
      if (token.key === "VALUE") {
        const parsed = this.extractValueAndType(token.value);
        values.push(parsed.value);
        types.push(parsed.type);
      } else if (token.key === "VARIABLE_REF") {
        const variable = this.store.getVariable(token.ref);
        if (variable) {
          values.push(variable);
        } else {
          throw new Error(`Variable not found: ${token.ref}`);
        }
        types.push(token.type);
      }
    }
  
    this.store.addVariable(variableToken.value, values, types);
    return [];
  }
  
  private extractValueAndType(rawValue: string | number): { value: string | number, type?: ValueType } {
    const strValue = String(rawValue);
    const numericPattern = /^(-?\d*\.?\d+)(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|mm|cm|in|pt|pc)?$/;
    const match = strValue.match(numericPattern);
  
    if (!match) {
      return { value: rawValue };
    }
  
    const [, numStr, unit] = match;
    return {
      value: unit ? numStr ?? "" : rawValue,
      type: unit as ValueType | undefined
    };
  }
  
  private resolveValue(valueToken: TokenValue): string {
    let value = "";
    
    if (valueToken.key === "VALUE") {
      value = this.formatValueWithType(valueToken.value);
    } else if (valueToken.key === "VARIABLE_REF") {
      const variable = this.store.getVariable(valueToken.ref);
      if (variable) {
        value = variable;
      } else {
        throw new Error(`Variable not found: ${valueToken.ref}`);
      }
      
      if (valueToken.type) {
        value = this.appendTypeToValue(value, valueToken.type);
      }
    } else {
      throw new Error(`Invalid value token: ${JSON.stringify(valueToken)}`);
    }
    
    return value;
  }

  private formatValueWithType(rawValue: string | number): string {
    if (typeof rawValue === 'number') {
      return rawValue.toString();
    }
    
    if (/(px|rem|em|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ex|ch)$/.test(rawValue)) {
      return rawValue;
    }
    
    if (/^\d+\.\d+$/.test(rawValue)) {
      return rawValue;
    }
    
    if (/^\d+\/\d+$/.test(rawValue)) {
      return rawValue;
    }
    
    return rawValue;
  }

  private appendTypeToValue(value: string, type: ValueType): string {
    if (new RegExp(`${type}$`).test(value)) {
      return value;
    }
    return `${value}${type}`;
  }

  private removeDuplicates(values: ProcessedValue[]): ProcessedValue[] {
    const uniqueValues: ProcessedValue[] = [];
    const seen = new Set<string>();

    for (const item of values) {
      if (item.property === 'LAYER') {
        uniqueValues.push(item);
        continue;
      }

      const key = `${item.property}:${JSON.stringify(item.values)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueValues.push(item);
      }
    }

    return uniqueValues;
  }

  private removeEmptyLayers(values: ProcessedValue[]): ProcessedValue[] {
    type Layer = {
      property: string;
      values: [name: string, action: "START" | "END"];
    };
    const nonEmptyValues: ProcessedValue[] = [];

    if (values.length === 1)  return values

    for (let i = 0; i < values.length - 1; i++) {
      if (values[i]!!.property === "LAYER" && values[i + 1]!!.property === "LAYER") {
        const layer: Layer = values[i] as Layer;
        const nextLayer: Layer = values[i + 1] as Layer;

        if (layer.values[0] === nextLayer.values[0] && layer.values[1] === "START" && nextLayer.values[1] === "END") {
          i++;
          continue;
        } else {
          nonEmptyValues.push(layer as ProcessedValue);
        }
      } else {
        nonEmptyValues.push(values[i]!!);
      }
    }

    return nonEmptyValues;
  }
}

export default Parser;