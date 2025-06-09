import path from 'node:path';
import fs from 'node:fs/promises';
import { Options } from '../options';

interface ResolvedImports { 
	readonly combinedContent: string;
	readonly filePaths: string[];
}

interface ImportMetadata {
	type: string | undefined;
	importPath: string;
}

class DependencyInjector {
	private fileCache = new Map<string, string>();
	private processedFiles = new Set<string>();
	private assetsPath: string;
	private importStack: string[] = [];

	constructor() {
		this.assetsPath = path.join(process.cwd(), 'templates');
	}

	private resolveFilePath(basePath: string, importPath: string): string {
		const ext = path.extname(importPath);
		const resolvedPath = ext === '' ? `${importPath}.lui` : importPath;
		return path.isAbsolute(resolvedPath) ? resolvedPath : path.join(basePath, resolvedPath);
	}

	async resolveImports(filePath: string, content: string): Promise<ResolvedImports> {
		const filePaths = new Set<string>();
		let combinedContent = '';

		this.importStack.push(filePath);
		
		const importRegex = /^(IMPORT|TEMPLATE)\s+\(([^)]+)\)/gm;
		const imports: ImportMetadata[] = [];
		let match;
		
		while ((match = importRegex.exec(content)) !== null) {
			const [_, type, importPath] = match;
			if (importPath) imports.push({ type, importPath });
		}

		for (const { type, importPath } of imports) {
			const fullImportPath = type === 'TEMPLATE'
				? this.resolveFilePath(this.assetsPath, importPath)
				: this.resolveFilePath(path.dirname(filePath), importPath);

			if (this.importStack.includes(fullImportPath)) {
				throw new Error(`Circular import detected: ${fullImportPath}`);
			}

			if (!this.fileCache.has(fullImportPath)) {
				try {
					const importedContent = await fs.readFile(fullImportPath, { encoding: 'utf-8' });
					this.fileCache.set(fullImportPath, importedContent);
				} catch (error) {
					throw new Error(`Failed to load ${type?.toLowerCase()} at ${fullImportPath}: ${error}`);
				}
			}

			if (!this.processedFiles.has(fullImportPath)) {
				this.processedFiles.add(fullImportPath);
				const { combinedContent: nestedContent, filePaths: nestedPaths } = 
					await this.resolveImports(fullImportPath, this.fileCache.get(fullImportPath)!);
				
				combinedContent += nestedContent;
				nestedPaths.forEach(p => filePaths.add(p));
			}
		}

		this.importStack.pop();

		const cleanedContent = content.replace(importRegex, '').trim();
		if (cleanedContent) {
			combinedContent += this.wrapWithLayerMarkers(filePath, cleanedContent) + '\n';
		}

		filePaths.add(filePath);
		return {
			combinedContent,
			filePaths: Array.from(filePaths)
		};
	}

	private wrapWithLayerMarkers(filePath: string, content: string): string {
		const layerName = this.getLayerName(filePath);
		return `LAYER ${layerName} START\n${content}\nLAYER ${layerName} END`;
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