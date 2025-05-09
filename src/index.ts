import fs from 'node:fs/promises';
import Tokenizer from './tokenizer/tokenizer';
import store from './store/store';
import Processor from './processor/process';
import CssParser from './parser/css-parser';
import DependencyInjector from './processor/dependency-injector';
import { parseCliArgs, Properties } from './options';

// const properties: Properties = {
//   inputFile: '../assets/test3.lui',
//   outputFile: undefined,
//   classNameFormat: 'full-name',
//   mode: 'standard',
// };

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
  // console.log("tokens", tokens);

  const processor = new Processor(store);
  const processedValues = processor.process(tokens);

  const variables = processor.getVariables();

  const cssParser = new CssParser(
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
  console.log(`CSS content written to ${outputPath}`);
})(properties);