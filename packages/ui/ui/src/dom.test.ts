//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { mx } from '@dxos/ui-theme';

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

  test('addClass uses mx for class merging', () => {
    const $el = $('<div>');
    
    // Simple string
    $el.addClass('foo bar');
    expect($el[0]!.classList.contains('foo')).toBe(true);
    expect($el[0]!.classList.contains('bar')).toBe(true);
    
    // Using mx directly - should merge conflicting Tailwind classes
    $el.addClass(mx('p-4', 'p-2')); // p-2 should win
    expect($el[0]!.classList.contains('p-2')).toBe(true);
    expect($el[0]!.classList.contains('p-4')).toBe(false);
    
    // Multiple arguments with conditionals
    const isActive = true;
    const isDisabled = false;
    $el.addClass('base-class', isActive && 'active', isDisabled && 'disabled');
    expect($el[0]!.classList.contains('base-class')).toBe(true);
    expect($el[0]!.classList.contains('active')).toBe(true);
    expect($el[0]!.classList.contains('disabled')).toBe(false);
  });
});
