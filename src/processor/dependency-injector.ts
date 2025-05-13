import path from 'node:path';
import fs from 'node:fs/promises';
import { Options } from '../options';

class DependencyInjector {
  private fileCache = new Map<string, string>();
  private assetsPath: string;

  constructor() {
    this.assetsPath = path.join(process.cwd(), 'assets');
  }

  private resolveFilePath(basePath: string, importPath: string): string {
    const ext = path.extname(importPath);
    const resolvedPath = ext === '' ? `${importPath}.lui` : importPath;
    return path.join(basePath, resolvedPath);
  }

  async resolveImports(filePath: string, content: string): Promise<{ combinedContent: string, filePaths: string[] }> {
    const filePaths = new Set<string>([filePath]);
    let combinedContent = this.wrapWithLayerMarkers(filePath, content);

    const importRegex = /^(IMPORT|TEMPLATE)\s+\(([^)]+)\)/gm;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [_, type, importPath] = match;
      
      if (!importPath) continue;
      
      const fullImportPath = type === 'TEMPLATE'
        ? this.resolveFilePath(this.assetsPath, importPath)
        : this.resolveFilePath(path.dirname(filePath), importPath);
      
      if (!this.fileCache.has(fullImportPath)) {
        try {
          const importedContent = await fs.readFile(fullImportPath, { encoding: 'utf-8' });
          this.fileCache.set(fullImportPath, importedContent);
          
          const { combinedContent: nestedContent, filePaths: nestedPaths } = 
            await this.resolveImports(fullImportPath, importedContent);
          
          combinedContent = nestedContent + '\n' + combinedContent;
          nestedPaths.forEach(p => filePaths.add(p));
        } catch (error) {
          throw new Error(`Failed to load ${type?.toLowerCase()} at ${fullImportPath}: ${error}`);
        }
      }
    }

    const cleanedContent = combinedContent.replace(/^\s*(IMPORT|TEMPLATE)\s+\([^)]+\)\s*$/gm, '');
    
    return {
      combinedContent: cleanedContent,
      filePaths: Array.from(filePaths)
    };
  }

  private wrapWithLayerMarkers(filePath: string, content: string): string {
    const layerName = this.getLayerName(filePath);
    return `LAYER ${layerName} START\n${content}\nLAYER ${layerName} END\n`;
  }

  private getLayerName(filePath: string): string {
    const options = Options.instance.getOptions();
    
    if (path.resolve(filePath) === path.resolve(options.inputFile)) {
      return path.basename(options.inputFile, path.extname(options.inputFile));
    }
    
    return path.basename(filePath, path.extname(filePath));
  }
}

export default DependencyInjector;