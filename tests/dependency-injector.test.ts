import { describe, it, expect, vi, beforeEach } from 'vitest';
import DependencyInjector from '../src/processor/dependency-injector';
import fs, { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { PathLike } from 'node:fs';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

describe('DependencyInjector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve imports and wrap with layer markers', async () => {
    const mainContent = `LAYER main START\nIMPORT (buttons.lui)\nLAYER main END`;
    const buttonsContent = `ADD btn-padding 10px`;

    // Мокуємо readFile відповідно до шляху
    vi.spyOn(fs, 'readFile').mockImplementation((filePath: PathLike | FileHandle) => {
      if (filePath.toString().endsWith('buttons.lui')) {
        return Promise.resolve(buttonsContent);
      }
      return Promise.resolve(mainContent);
    });

    const di = new DependencyInjector();
    const result = await di.resolveImports('/path/to/main.lui', mainContent);

    expect(result.combinedContent).toContain('LAYER buttons START');
    expect(result.combinedContent).toContain('LAYER buttons END');
    expect(result.combinedContent).toContain('btn-padding');
    expect(result.filePaths).toHaveLength(2);
  });

  it('should detect circular imports', async () => {
    const file1 = `IMPORT (file2.lui)`;
    const file2 = `IMPORT (file1.lui)`;
    
    vi.spyOn(fs, 'readFile').mockImplementation((filePath: PathLike | FileHandle) => {
      if (filePath.toString().endsWith('file1.lui')) return Promise.resolve(file1);
      if (filePath.toString().endsWith('file2.lui')) return Promise.resolve(file2);
      return Promise.resolve('');
    });
    
    const di = new DependencyInjector();
    
    await expect(
      di.resolveImports('/path/to/file1.lui', file1)
    ).rejects.toThrow('Circular import detected');
  });
});