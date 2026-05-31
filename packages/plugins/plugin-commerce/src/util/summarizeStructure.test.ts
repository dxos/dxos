//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { summarizeStructure } from './summarizeStructure';

const card = (index: number) => `
  <li data-advertid="ad-${index}" data-testid="advertCard-${index}">
    <a data-testid="search-listing-title">Porsche 911 #${index}</a>
    <span data-testid="price">£${90000 + index}</span>
    <img data-testid="carousel-image-0" />
    <img data-testid="carousel-image-1" />
  </li>`;

const html = `<html><body><ul>${[0, 1, 2, 3, 4].map(card).join('')}</ul></body></html>`;

describe('summarizeStructure', () => {
  test('collapses indexed testids into prefix selectors with counts', ({ expect }) => {
    const summary = summarizeStructure(html);
    expect(summary).toContain('[data-testid^="advertCard-"]  ×5');
    expect(summary).toContain('[data-advertid]  ×5');
    // Indexed image fields collapse to one prefix candidate (2 per card × 5 cards).
    expect(summary).toContain('[data-testid^="carousel-image-"]  ×10');
    // Exact (non-indexed) repeated fields are listed verbatim.
    expect(summary).toContain('[data-testid="search-listing-title"]  ×5');
  });

  test('ranks the wrapping container above the fields it contains', ({ expect }) => {
    const summary = summarizeStructure(html);
    const lines = summary.split('\n').filter((line) => line.startsWith('['));
    // The advertCard container (wraps several fields) ranks before a leaf field like the title.
    const containerIndex = lines.findIndex((line) => line.includes('advertCard-'));
    const titleIndex = lines.findIndex((line) => line.includes('search-listing-title'));
    expect(containerIndex).toBeGreaterThanOrEqual(0);
    expect(containerIndex).toBeLessThan(titleIndex);
  });

  test('returns empty string when nothing repeats enough', ({ expect }) => {
    expect(summarizeStructure('<div data-testid="solo">x</div>', { minCount: 3 })).toEqual('');
  });
});
