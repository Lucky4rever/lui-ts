import { describe, it, expect } from 'vitest';
import { minimalisticClassFormatter, standardClassFormatter, fullNamesClassFormatter } from '../src/stylist/class-formatter';
import { ProcessedValue } from '../src/processor/processed-value';

describe('Class Formatters', () => {
  const baseValue: ProcessedValue = {
    property: 'width',
    values: ['100px']
  };

  it('should format minimalistic class names', () => {
    const className = minimalisticClassFormatter(baseValue);
    expect(className).toBe('.w_100px');
  });

  it('should format standard class names', () => {
    const className = standardClassFormatter(baseValue);
    expect(className).toBe('.w_100px');
  });

  it('should format full names class names', () => {
    const className = fullNamesClassFormatter(baseValue);
    expect(className).toBe('.Width_100px');
  });

  it('should handle pseudo-classes in minimalistic format', () => {
    const value: ProcessedValue = {
      ...baseValue,
      pseudoClass: ':hover'
    };
    const className = minimalisticClassFormatter(value);
    expect(className).toBe('.w_100px_h');
  });

  it('should handle media queries', () => {
    const value: ProcessedValue = {
      ...baseValue,
      media: '(min-width: 768px)'
    };
    const className = minimalisticClassFormatter(value);
    expect(className).toBe('.w_100px_m768');
  });
});