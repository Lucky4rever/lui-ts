import path from "node:path";
import { ClassNameFormatMode, classNameFormatters } from "./parser/class-formatter";
import { CSS_FORMAT_MODES, CssFormatModeType } from "./parser/css-parser";

export interface Properties {
  inputFile: string;
  outputFile: string;

  classNameFormat: ClassNameFormatMode;
  mode: CssFormatModeType;

  layers: boolean;
}

export class Options {
  private state: Properties;
  static #instance: Options;

  private constructor() {
    this.state = {
      inputFile: '',
      outputFile: './output.css',
      classNameFormat: 'minimalistic',
      mode: 'standard',
      layers: false,
    };
  }

  public static get instance(): Options {
    if (!Options.#instance) {
      Options.#instance = new Options();
    }

    return Options.#instance;
  }

  public updateOptions(newOptions: Partial<Properties>) {
    this.state = { ...this.state, ...newOptions };
  }

  public getOptions(): Properties {
    return this.state;
  }
}

export function parseCliArgs(args: string[]): Properties {
  const result: Partial<Properties> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i] || '';

    if (arg.startsWith('--')) {
      const paramName = arg.substring(2, arg.lastIndexOf('=') !== -1 ? arg.lastIndexOf('=') : undefined);
      const paramValue = arg.substring(arg.lastIndexOf('=') + 1, arg.length);

      switch (paramName) {
        case 'output':
          result.outputFile = paramValue;
          break;
        case 'class-format':
          if (Object.keys(classNameFormatters).includes(paramValue)) {
            result.classNameFormat = paramValue as ClassNameFormatMode;
          }
          break;
        case 'mode':
          const isCssFormatMode = (value: string): value is CssFormatModeType => {
            return CSS_FORMAT_MODES.has(value as any);
          }
          
          if (isCssFormatMode(paramValue)) {
            result.mode = paramValue as CssFormatModeType;
          }
          break;
        case 'layers':
          result.layers = paramValue === 'true';
          break;
        default:
          break;
      }
      i++;
    } 
    // Обробка позиційних параметрів
    else {
      if (!result.inputFile) {
        result.inputFile = path.resolve(arg);
      } else if (!result.outputFile) {
        result.outputFile = path.resolve(arg);
      }
      i++;
    }
  }

  if (!result.inputFile) {
    throw new Error('Не вказано вхідний файл');
  }

  Options.instance.updateOptions(result);

  return Options.instance.getOptions();
}
