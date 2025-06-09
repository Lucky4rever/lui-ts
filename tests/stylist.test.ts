import { describe, it, expect } from 'vitest';
import CssStylist from '../src/stylist/css-stylist';
import { ProcessedValue } from '../src/processor/processed-value';

describe('CssStylist', () => {
  it('should generate CSS for simple ADD statement', () => {
    const processedValues: ProcessedValue[] = [{
      property: 'width',
      values: ['100px']
    }];
    
    const stylist = new CssStylist({
      processedValues,
      classNameFormat: 'minimalistic',
      mode: 'minimalistic'
    });
    
    const css = stylist.generateCss();
    
    expect(css).toContain('.w_100px{width:100px}');
  });

  it('should handle variables in minimalistic format', () => {
    const processedValues: ProcessedValue[] = [{
      property: 'width',
      values: ['50px'],
      optionalName: 'size'
    }];
    
    const stylist = new CssStylist({
      processedValues,
      classNameFormat: 'minimalistic',
      mode: 'minimalistic'
    });
    
    const css = stylist.generateCss();
    
    expect(css).toContain('.w_sz{width:50px}');
  });

  it('should handle pseudo-classes', () => {
    const processedValues: ProcessedValue[] = [{
      property: 'background',
      values: ['blue'],
      pseudoClass: ':hover'
    }];
    
    const stylist = new CssStylist({
      processedValues,
      classNameFormat: 'minimalistic',
      mode: 'minimalistic'
    });
    
    const css = stylist.generateCss();
    
    expect(css).toContain('.b_blue_h:hover{background:blue}');
  });
});