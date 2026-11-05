//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { markdownHighlightStyle } from './highlight.ts';

describe('markdownHighlightStyle', () => {
  test('sizes headings by default', ({ expect }) => {
    expect(rules()).toContain('font-size');
  });

  test('fixedHeight leaves headings at the body text size', ({ expect }) => {
    expect(rules(true)).not.toContain('font-size');
    expect(rules(true)).not.toContain('line-height');
  });

  test('is built once per variant', ({ expect }) => {
    expect(markdownHighlightStyle({ fixedHeight: true })).toBe(markdownHighlightStyle({ fixedHeight: true }));
    expect(markdownHighlightStyle()).toBe(markdownHighlightStyle());
  });
});

const rules = (fixedHeight?: boolean) => markdownHighlightStyle({ fixedHeight }).module?.getRules() ?? '';
