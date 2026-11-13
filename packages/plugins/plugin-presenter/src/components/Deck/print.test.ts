//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const css = readFileSync(new URL('./print.css', import.meta.url), 'utf8');

/** Selectors of the rules inside the `@media print` block. */
const printSelectors = (): string[] => {
  const start = css.indexOf('@media print');
  const block = css.slice(css.indexOf('{', start) + 1);
  return [...block.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(([, selectors]) =>
    selectors
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(',')
      .map((selector) => selector.trim()),
  );
};

describe('print stylesheet', () => {
  test('every print rule is scoped to the deck being printed', () => {
    const selectors = printSelectors();
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector).toMatch(/^html\[data-printing-deck\]/);
    }
  });

  test('has no global page rule and keeps the print container hidden on screen', () => {
    expect(css).not.toMatch(/@page\s*\{/);
    expect(css).toMatch(/@page slide\s*\{[^}]*size: 2560px 1440px/);
    expect(css).toMatch(/^\[data-print-deck\]\s*\{\s*display: none/m);
  });

  test('prints one slide per page with every click step shown', () => {
    expect(css).toMatch(/\[data-print-slide\]\s*\{[^}]*page: slide[^}]*break-after: page/);
    expect(css).toMatch(/\[data-step\]\s*\{\s*visibility: visible !important/);
  });
});
