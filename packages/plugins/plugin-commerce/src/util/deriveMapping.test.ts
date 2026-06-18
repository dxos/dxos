//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { deriveResultMapping } from './deriveMapping';
import { extractResults } from './extractResults';

// Mirrors AutoTrader's real results DOM: <li data-advertid> cards wrapping a titled link + image.
const card = (index: number) => `
  <li id="id-${index}" data-testid="id-${index}" data-advertid="${index}" class="sc-mddoqs-1">
    <a data-testid="search-listing-title" href="/car-details/${index}">Porsche 911 #${index}</a>
    <p data-testid="search-listing-subtitle">3.0 Carrera</p>
    <img src="https://img/${index}.jpg" />
  </li>`;

const html = `<main><section data-testid="desktop-search"><ul>${[1, 2, 3, 4, 5]
  .map(card)
  .join('')}</ul></section></main>`;

describe('deriveResultMapping', () => {
  test('derives a working container + field mapping from the rendered DOM', ({ expect }) => {
    const mapping = deriveResultMapping(html);
    if (!mapping) {
      throw new Error('expected a derived mapping');
    }
    expect(mapping.itemLocator).toBeDefined();
    expect(mapping.fields.title).toBeDefined();

    // The derived mapping actually extracts titled rows.
    const rows = extractResults(html, mapping);
    const titled = rows.filter((row) => row.title.length > 0);
    expect(titled.length).toEqual(5);
    expect(titled[0].title).toContain('Porsche 911');
    expect(titled[0].url).toContain('/car-details/');
  });

  test('returns undefined when there is no repeating titled container', ({ expect }) => {
    expect(deriveResultMapping('<div><p>nothing repeating here</p></div>')).toBeUndefined();
  });
});
