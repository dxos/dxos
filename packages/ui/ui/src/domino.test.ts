//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { mx } from '@dxos/ui-theme';

import { Domino } from './domino';

describe('domino', () => {
  test('classNames uses mx for class merging', () => {
    const el = Domino.of('div').classNames('foo bar').root;

    // Simple string.
    expect(el.classList.contains('foo')).toBe(true);
    expect(el.classList.contains('bar')).toBe(true);

    // Using mx directly - should merge conflicting Tailwind classes.
    const el2 = Domino.of('div').classNames(mx('p-4', 'p-2')).root; // p-2 should win.
    expect(el2.classList.contains('p-2')).toBe(true);
    expect(el2.classList.contains('p-4')).toBe(false);

    // Array with conditionals.
    const isActive = true;
    const isDisabled = false;
    const el3 = Domino.of('div').classNames(['base-class', isActive && 'active', isDisabled && 'disabled']).root;
    expect(el3.classList.contains('base-class')).toBe(true);
    expect(el3.classList.contains('active')).toBe(true);
    expect(el3.classList.contains('disabled')).toBe(false);
  });

  test('Domino builds HTML elements', () => {
    const el = Domino.of('div').text('Hello').classNames('test-class').root;

    expect(el.tagName.toLowerCase()).toBe('div');
    expect(el.textContent).toBe('Hello');
    expect(el.classList.contains('test-class')).toBe(true);
  });

  test('Domino adds attributes', () => {
    const el = Domino.of('input').attributes({ type: 'text', placeholder: 'Enter text' }).root;

    expect(el.getAttribute('type')).toBe('text');
    expect(el.getAttribute('placeholder')).toBe('Enter text');
  });

  test('Domino adds data attributes', () => {
    const el = Domino.of('div').data('testId', '123').root;

    expect((el as HTMLElement).dataset.testId).toBe('123');
  });

  test('Domino adds event listeners', () => {
    let clicked = false;
    const el = Domino.of('button').on('click', () => {
      clicked = true;
    }).root;

    el.click();
    expect(clicked).toBe(true);
  });

  test('Domino creates an SVG element', () => {
    const el = Domino.of('circle', Domino.SVG).root;
    // Note: happy-dom returns uppercase tagName even for createElementNS in some versions/contexts.
    expect(el.tagName.toLowerCase()).toBe('circle');
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  test('Domino creates nested SVG elements', () => {
    const svg = Domino.of('svg', Domino.SVG).append(Domino.of('circle', Domino.SVG)).root;
    expect(svg.querySelector('circle')).toBeTruthy();
  });

  test('Domino on() respects AddEventListenerOptions (once)', () => {
    let count = 0;
    const el = Domino.of('button').on('click', () => count++, { once: true }).root;
    el.click();
    el.click();
    expect(count).toBe(1);
  });

  test('Domino mount() attaches to parent and stays chainable', () => {
    const parent = document.createElement('div');
    const el = Domino.of('span').text('hi').mount(parent).classNames('mounted').root;
    expect(parent.firstChild).toBe(el);
    expect(el.textContent).toBe('hi');
    expect(el.classList.contains('mounted')).toBe(true);
  });

  test('Domino.iconsUrl can be overridden at module level', () => {
    const original = Domino.iconsUrl;
    try {
      Domino.iconsUrl = 'https://example.test/icons.svg';
      expect(Domino.icon('foo')).toBe('https://example.test/icons.svg#foo');
      const svg = Domino.svg('foo').root;
      expect(svg.querySelector('use')?.getAttribute('href')).toBe('https://example.test/icons.svg#foo');
    } finally {
      Domino.iconsUrl = original;
    }
  });
});
