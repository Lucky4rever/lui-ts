import { Options } from '../options';
import { CSS_FUNCTIONS_SET } from "../consts/css-functions";
import { PROPERTIES_REQUIRING_SET } from "../consts/properties-requiring-units";
import { ProcessedValue } from "../processor/processed-value";
import { ClassNameFormatMode, selectClassNameFormatter } from "./class-formatter";

export const CSS_FORMAT_MODES = new Set(['minimalistic', 'standard', 'pretty']);
export type CssFormatModeType = typeof CSS_FORMAT_MODES extends Set<infer T> ? T : never;

export type CssParserOptions = {
  processedValues: ProcessedValue[];
  classNameFormat: ClassNameFormatMode;
  mode?: CssFormatModeType;
};

// Регулярні вирази для перевірки значень
const UNIT_REGEX = /(^|\s)(\d+)(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|mm|cm|in|pt|pc)(\s|$)/;
const COLOR_HEX_REGEX = /^#([0-9a-f]{3}){1,2}$/i;
const COLOR_FUNC_REGEX = /^rgb(a?)\(.*\)$|^hsl(a?)\(.*\)$/i;
const NUMERIC_REGEX = /^-?\d*\.?\d+$/;

class CssParser {
  private processedValues: ProcessedValue[];
  private classNameFormat: ClassNameFormatMode;
  private mode: CssFormatModeType;
  private layersEnabled: boolean;
  private layerStack: string[] = [];

  constructor(options: CssParserOptions);
  constructor(
    processedValues: ProcessedValue[],
    classNameFormat: ClassNameFormatMode,
    mode?: CssFormatModeType
  );
  constructor(
    arg1: CssParserOptions | ProcessedValue[],
    arg2?: ClassNameFormatMode,
    arg3: CssFormatModeType = 'standard'
  ) {
    if (Array.isArray(arg1)) {
      this.processedValues = arg1;
      this.classNameFormat = arg2!;
      this.mode = arg3;
    } else {
      this.processedValues = arg1.processedValues;
      this.classNameFormat = arg1.classNameFormat;
      this.mode = arg1.mode ?? 'standard';
    }
    
    this.layersEnabled = Options.instance.getOptions().layers;
  }

  private isCssFunction(value: string): boolean {
    for (const fn of CSS_FUNCTIONS_SET) {
      if (value.startsWith(`${fn}(`)) return true;
    }
    return false;
  }

  private needsPx(value: string, property: string): boolean {
    const COMPOUND_PROPERTIES = new Set(['border', 'margin', 'padding', 'background', 'font', 'animation']);
    
    if (COMPOUND_PROPERTIES.has(property)) {
      return false;
    }
  
    if (UNIT_REGEX.test(value)) return false;
    if (this.isCssFunction(value)) return false;
    if (COLOR_HEX_REGEX.test(value) || COLOR_FUNC_REGEX.test(value)) return false;
    return PROPERTIES_REQUIRING_SET.has(property);
  }

  private validateValue(value: string, property: string): string {
    const trimmedValue = value.trim();
    if (!trimmedValue) throw new Error(`Empty value for property ${property}`);
  
    // Спеціальна обробка для властивостей, які можуть містити кілька значень
    const COMPOUND_PROPERTIES = new Set(['border', 'margin', 'padding', 'background', 'font', 'animation']);
    
    if (COMPOUND_PROPERTIES.has(property)) {
      // Для складених властивостей повертаємо значення як є
      return trimmedValue;
    }
  
    if (!this.needsPx(trimmedValue, property)) {
      return trimmedValue;
    }
  
    if (NUMERIC_REGEX.test(trimmedValue)) {
      return `${trimmedValue}px`;
    }
  
    throw new Error(`Invalid value '${value}' for property '${property}'. Expected a number with unit or valid CSS value.`);
  }

  private formatBlock(className: string, property: string, value: string): string {
    const cssValue = this.validateValue(value, property);
    const indent = this.getIndent();
    
    const formatMap: {[value: CssFormatModeType]: string} = {
      minimalistic: `${indent}${className}{${property}:${cssValue}}`,
      standard: `${indent}${className} {\n${indent}  ${property}: ${cssValue};\n${indent}}`,
      pretty: `${indent}${className} {\n${indent}    ${property}: ${cssValue};\n${indent}}`
    };

    return formatMap[this.mode] || `${indent}${className} { ${property}: ${cssValue}; }`;
  }

  private formatLayer(layerName: string, action: 'START' | 'END'): string {
    if (!this.layersEnabled) return '';
    
    const indent = this.getIndent();
    
    if (action === 'START') {
      this.layerStack.push(layerName);
      return `${indent}@layer ${layerName} {`;
    } else {
      this.layerStack.pop();
      return '}';
    }
  }

  private getIndent(): string {
    if (this.mode === 'minimalistic') return '';
    const baseIndent = this.mode === 'pretty' ? '    ' : '  ';
    return baseIndent.repeat(this.layerStack.length);
  }

  private formatComment(comment: string): string {
    const indent = this.getIndent();
    return `${indent}/* ${comment} */`;
  }

  public generateCss(): string {
    const lines: string[] = [];
    const allLayers = new Set<string>();

    // Збираємо всі шари
    for (const item of this.processedValues) {
      if (item.property === 'LAYER') {
        allLayers.add(item.values[0] as string);
      }
    }

    // Додаємо імпорти шарів на початку
    if (this.layersEnabled && allLayers.size > 0) {
      lines.push(`@layer ${Array.from(allLayers).join(', ')};`);
    }

    for (const item of this.processedValues) {
      if (item.property === 'COMMENT') {
        lines.push(this.formatComment(item.values.join(' ')));
        continue;
      }

      if (item.property === 'LAYER') {
        const [layerName, action] = item.values as [string, 'START' | 'END'];
        const layerCss = this.formatLayer(layerName, action);
        if (layerCss) lines.push(layerCss);
        continue;
      }

      const formatter = selectClassNameFormatter(this.classNameFormat);
      const className = formatter(item);
      const joinedValues = item.values.join(' ');
      const values = this.validateValue(joinedValues, item.property);
      
      lines.push(this.formatBlock(className, item.property, values));
    }

    return lines.join('\n').trim();
  }
}

export default CssParser;