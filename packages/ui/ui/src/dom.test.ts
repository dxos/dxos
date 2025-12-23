//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { $ } from './dom';

describe('dom', () => {
  test('$.svg creates an SVG element', () => {
    const $el = $.svg('circle');
    // Note: happy-dom returns uppercase tagName even for createElementNS in some versions/contexts.
    expect($el[0]!.tagName.toLowerCase()).toBe('circle');
    expect($el[0]!.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  test('$.svg creates nested elements', () => {
    const $svg = $.svg('svg');
    const $circle = $.svg('circle');
    $svg.append($circle);
    expect($svg.find('circle').length).toBe(1);
  });
});
