//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { markdownHighlightStyle } from './highlight.ts';

const rules = (fixedHeight?: boolean) => markdownHighlightStyle({ fixedHeight }).module?.getRules() ?? '';

describe('markdownHighlightStyle', () => {
  test('sizes headings by default', () => {
    expect(rules()).toContain('font-size');
  });

  test('fixedHeight leaves headings at the body text size', () => {
    expect(rules(true)).not.toContain('font-size');
    expect(rules(true)).not.toContain('line-height');
  });

  test('is built once per variant', () => {
    expect(markdownHighlightStyle({ fixedHeight: true })).toBe(markdownHighlightStyle({ fixedHeight: true }));
    expect(markdownHighlightStyle()).toBe(markdownHighlightStyle());
  });
});
