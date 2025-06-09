import path from "node:path";
import { ClassNameFormatMode, classNameFormatters } from "./stylist/class-formatter";
import { CSS_FORMAT_MODES, CssFormatModeType } from "./stylist/css-stylist";

export interface Properties {
  inputFile: string;
  outputFile: string | undefined;

  classNameFormat: ClassNameFormatMode;
  mode: CssFormatModeType;

  layers: boolean;
  mobileFirst: boolean;

  // debug options
  showUsedFiles: boolean;
  showTokens: boolean;
  showVariables: boolean;
  showProcessedValues: boolean;
  logs: boolean;
}

export class Options {
  private state: Properties;
  static #instance: Options;

  private constructor() {
    this.state = {
      inputFile: '',
      outputFile: undefined,
      classNameFormat: 'standard',
      mode: 'standard',
      layers: false,
      mobileFirst: false,

      showUsedFiles: false,
      showTokens: false,
      showVariables: false,
      showProcessedValues: false,
      logs: false,
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

function parseLongParam(arg: string): Partial<Properties> {
  const result: Partial<Properties> = {};
  
  const paramName = arg.substring(2, arg.lastIndexOf('=') !== -1 ? arg.lastIndexOf('=') : undefined);
  const paramValue = arg.substring(arg.lastIndexOf('=') + 1, arg.length);

  switch (paramName) {
    case 'output':
    case 'outputFile':
    case 'output-file':
      result.outputFile = paramValue;
      break;
    case 'class-format':
      if (Object.keys(classNameFormatters).includes(paramValue)) {
        result.classNameFormat = paramValue as ClassNameFormatMode;
      } else {
        throw new Error(`Unknown class format: ${paramValue}`);
      }
      break;
    case 'mode':
      const isCssFormatMode = (value: string): value is CssFormatModeType => {
        return CSS_FORMAT_MODES.has(value as any);
      }
      
      if (isCssFormatMode(paramValue)) {
        result.mode = paramValue as CssFormatModeType;
      } else {
        throw new Error(`Unknown CSS format mode: ${paramValue}`);
      }
      break;
    case 'layers':
      result.layers = paramValue === 'false' ? false : true;;
      break;
    case 'mobile-first':
      result.mobileFirst = paramValue === 'false' ? false : true;
      break;
    case 'show-used-files':
      result.showUsedFiles = paramValue === 'false' ? false : true;
      break;
    case 'show-tokens':
      result.showTokens = paramValue === 'false' ? false : true;
      break;
    case 'show-variables':
      result.showVariables = paramValue === 'false' ? false : true;
      break;
    case 'show-processed-values':
      result.showProcessedValues = paramValue === 'false' ? false : true;
      break;
    case 'logs':
      result.logs = paramValue === 'false' ? false : true;
      break;
    case 'debug':
      result.showUsedFiles = true;
      result.showTokens = true;
      result.showVariables = true;
      result.showProcessedValues = true;
      result.logs = true;
      break;
    default:
      throw new Error(`Unknown parameter: ${paramName}. Use --help to see available options.`);
  }

  return result;
}

function parseShortParam(arg: string): Partial<Properties> {
  const result: Partial<Properties> = {};

  const paramName = arg.substring(1, arg.lastIndexOf('=') !== -1 ? arg.lastIndexOf('=') : undefined);
  const paramValue = arg.substring(arg.lastIndexOf('=') + 1, arg.length);

  switch (paramName) {
    case 'o':
      result.outputFile = paramValue;
      break;
    case 'c':
      if (Object.keys(classNameFormatters).includes(paramValue)) {
        result.classNameFormat = paramValue as ClassNameFormatMode;
      } else {
        throw new Error(`Unknown class format: ${paramValue}`);
      }
      break;
    case 'm':
      const isCssFormatMode = (value: string): value is CssFormatModeType => {
        return CSS_FORMAT_MODES.has(value as any);
      }
      
      if (isCssFormatMode(paramValue)) {
        result.mode = paramValue as CssFormatModeType;
      } else {
        throw new Error(`Unknown CSS format mode: ${paramValue}`);
      }
      break;
    case 'L':
      result.layers = paramValue === 'false' ? false : true;;
      break;
    case 'M':
      result.mobileFirst = paramValue === 'false' ? false : true;
      break;
    case 'f':
      result.showUsedFiles = paramValue === 'false' ? false : true;
      break;
    case 't':
      result.showTokens = paramValue === 'false' ? false : true;
      break;
    case 'v':
      result.showVariables = paramValue === 'false' ? false : true;
      break;
    case 'p':
      result.showProcessedValues = paramValue === 'false' ? false : true;
      break;
    case 'l':
      result.logs = paramValue === 'false' ? false : true;
      break;
    case 'd':
      result.showUsedFiles = true;
      result.showTokens = true;
      result.showVariables = true;
      result.showProcessedValues = true;
      result.logs = true;
      break;
    default:
      throw new Error(`Unknown parameter: ${paramName}. Use --help to see available options.`);
  }

  return result;
}

export function parseCliArgs(args: string[]): Properties {
  let result: Partial<Properties> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i] || '';

    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: css-processor <input-file> [output-file] [options]
Options:
  --help, -h                           Show this help message
  --output <file>, -o <file>           Specify output file path
  --class-format <format>, -c <format> Specify class name format (minimalistic, standard, full-name)
  --mode <mode>, -m <mode>             Specify CSS format mode (minimalistic, standard, pretty)
  --layers, -L                         Enable or disable layers (default: false)
  --mobile-first                       Enable or disable mobile-first approach (default: false)
  --show-used-files, -f                Show used files in output (default: false)
  --show-tokens, -t                    Show tokens in output (default: false)
  --show-variables, -v                 Show variables in output (default: false)
  --show-processed-values, -p          Show processed values in output (default: false)
  --logs, -l                           Enable or disable logs (default: false)
  --debug, -d                          Enable all debug options (equivalent to --show-used-files --show-tokens --show-variables --show-processed-values --logs at once)
     `);
      process.exit(0);
    } else if (arg.startsWith('--')) {
      result = { ...result, ...parseLongParam(arg) };
      i++;
    } else if (arg.startsWith('-')) {
      result = { ...result, ...parseShortParam(arg) };
      i++;
    } else {
      if (!result.inputFile) {
        result.inputFile = path.resolve(arg);
      } else if (!result.outputFile) {
        result.outputFile = path.resolve(arg);
      }
      i++;
    }
  }

  if (!result.inputFile) {
    throw new Error('Input file is required. Please provide a valid path to the input file.');
  }

  Options.instance.updateOptions(result);

  return Options.instance.getOptions();
}
