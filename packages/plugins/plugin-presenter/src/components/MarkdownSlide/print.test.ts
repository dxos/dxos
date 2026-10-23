//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { MarkdownSlide } from './MarkdownSlide.tsx';

const css = readFileSync(new URL('./print.css', import.meta.url), 'utf8');

describe('print stylesheet', () => {
  test('reveals every stepped element on paper', () => {
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toMatch(/\[data-slide\] \[data-step\]\s*\{\s*visibility: visible !important/);
  });

  test('targets the attribute that hidden click steps carry', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MarkdownSlide, { content: '<v-clicks>\n\n- one\n- two\n\n</v-clicks>', step: 0 }),
    );
    expect(markup).toMatch(
      /<li[^>]*class="[^"]*invisible[^"]*"[^>]*data-step="1"|<li[^>]*data-step="1"[^>]*class="[^"]*invisible/,
    );
  });

  test('sizes the page to the slide canvas and hides the app chrome', () => {
    expect(css).toContain('size: 2560px 1440px');
    expect(css).toMatch(/body \*\s*\{\s*visibility: hidden/);
    expect(css).toContain("[data-testid='presenter.deck']");
  });
});
