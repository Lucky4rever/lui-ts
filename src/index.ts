import fs from 'node:fs/promises';
import Tokenizer from './tokenizer/tokenizer';
import store, { VariableValue } from './store/store';
import Parser from './processor/parser';
import CssStylist from './stylist/css-stylist';
import DependencyInjector from './processor/dependency-injector';
import { parseCliArgs, Properties } from './options';
import { TokenValue } from './tokenizer/token-value';
import { ProcessedValue } from './processor/processed-value';

const startTime = Date.now();

const args = process.argv.slice(2);

const properties: Properties = parseCliArgs(args);

if (!properties.inputFile) {
  console.error("Input file is required.");
  process.exit(1);
}

(async (properties: Properties) => {
  const inputPath = properties.inputFile;
  
  let { combinedContent: content, filePaths: paths }: { combinedContent: string, filePaths: string[] } = { combinedContent: '', filePaths: [] };

  try {
  const DI = new DependencyInjector();
  const inputContent = await fs.readFile(inputPath, { encoding: 'utf-8' });
  
  const { combinedContent, filePaths } = await DI.resolveImports(inputPath, inputContent);
    content = combinedContent;
    paths = filePaths;
  } catch (error) {
    console.error("Error during file reading:", error);
    process.exit(1);
  } finally {
    properties.showUsedFiles && console.log("Used files:\n", paths);
  }
  
  let tokens: TokenValue[] = [];
  try {
    const tokenizer = new Tokenizer();
    tokens = tokenizer.tokenize(content);
  } catch (error) {
    console.error("Error during tokenization:", error);
    process.exit(1);
  } finally {
    properties.showTokens && console.log("Tokens:\n", tokens);
  }

  let processedValues: ProcessedValue[] = [];
  let variables: Record<string, string> = {};
  try {
    const parser = new Parser(store);
    processedValues = parser.parse(tokens);
    variables = parser.getVariables();
  } catch (error) {
    console.error("Error during parsing:", error);
    process.exit(1);
  } finally {
    properties.showProcessedValues && console.log("Processed values:\n", processedValues);
    properties.showVariables && console.log("Variables:\n", variables);
  }

  let cssContent = '';
  const outputPath = properties.outputFile ?? `${inputPath.substring(0, inputPath.lastIndexOf('.'))}.css`;
  try {
    const cssParser = new CssStylist(
      processedValues, 
      properties.classNameFormat ?? 'minimalistic', 
      properties.mode ?? 'standard'
    );
    cssContent = cssParser.generateCss();

    await fs.writeFile(outputPath, cssContent, { encoding: 'utf-8', flag: 'w' });
  } catch (error) {
    console.error("Error during CSS generation:", error);
    process.exit(1);
  }

  console.log('\x1b[33m%s\x1b[0m', `CSS content written to ${outputPath}`);
  if (properties.logs) {
    console.log('\x1b[36m%s\x1b[0m', `Generated CSS classes: ${processedValues.filter(item => item.property !== 'LAYER').length}`);
    console.log('\x1b[36m%s\x1b[0m', `Output file size: ${Buffer.byteLength(cssContent)} bytes`);

    const endTime = Date.now();
    console.log('\x1b[36m%s\x1b[0m', `Execution time: ${(endTime - startTime)} miliseconds`);
  }
})(properties);
