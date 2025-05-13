import fs from 'node:fs/promises';
import Tokenizer from './tokenizer/tokenizer';
import store from './store/store';
import Parser from './processor/parser';
import CssStylist from './stylist/css-stylist';
import DependencyInjector from './processor/dependency-injector';
import { parseCliArgs, Properties } from './options';

const startTime = Date.now();

const args = process.argv.slice(2);

const properties: Properties = parseCliArgs(args);

if (!properties.inputFile) {
  console.error("Input file is required.");
  process.exit(1);
}

(async (properties: Properties) => {
  const inputPath = properties.inputFile;
  
  const DI = new DependencyInjector();
  const inputContent = await fs.readFile(inputPath, { encoding: 'utf-8' });
  
  const { combinedContent, filePaths } = await DI.resolveImports(inputPath, inputContent);
  
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(combinedContent);

  const parser = new Parser(store);
  const processedValues = parser.process(tokens);

  const variables = parser.getVariables();

  const cssParser = new CssStylist(
    processedValues, 
    properties.classNameFormat ?? 'minimalistic', 
    properties.mode ?? 'standard'
  );
  const cssContent = cssParser.generateCss();

  // console.log("Used files:", filePaths);
  // console.log("tokens", tokens);
  // console.log("variables", variables);
  // console.log("processedValues", processedValues);

  const outputPath = properties.outputFile ?? `${inputPath.substring(0, inputPath.lastIndexOf('.'))}.css`;
  await fs.writeFile(outputPath, cssContent, { encoding: 'utf-8', flag: 'w' });
  console.log('\x1b[33m%s\x1b[0m', `CSS content written to ${outputPath}`);
  console.log('\x1b[36m%s\x1b[0m', `Generated CSS classes: ${processedValues.length}`);

  const endTime = Date.now();
  console.log('\x1b[36m%s\x1b[0m', `Execution time: ${(endTime - startTime) / 1000} seconds`);
})(properties);