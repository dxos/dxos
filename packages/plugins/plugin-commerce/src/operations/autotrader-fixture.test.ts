//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { type Provider } from '../types';
import { extractResults } from '../util';

// Cleaned (script/style-stripped) capture of a real AutoTrader UK results page. The raw multi-MB
// "Save Page As" is gitignored; this committed sample is produced by `cleanHtml` (see fixtures/README).
const SAMPLE = readFileSync(
  fileURLToPath(new URL('../testing/fixtures/autotrader-results.sample.html', import.meta.url)),
  'utf8',
);

// A result mapping of the shape the LLM skill is expected to author for AutoTrader (selectors
// over the real `data-testid`s). This test proves the ENGINE's extraction primitive can pull
// structured listings from genuine AutoTrader markup — not that we hand-maintain this template.
const RESULT_MAPPING: Provider.ResultMapping = {
  responseType: 'html',
  itemLocator: '[data-testid^="advertCard-"]',
  fields: {
    title: { selector: '[data-testid="search-listing-title"]' },
    url: { selector: 'a', attr: 'href' },
    mileage: { selector: '[data-testid="mileage"]' },
    image: { selector: 'img', attr: 'src' },
  },
};

describe('extraction against real AutoTrader markup', () => {
  test('extracts >= 10 listings from the rendered results page', ({ expect }) => {
    const results = extractResults(SAMPLE, RESULT_MAPPING);

    const withTitle = results.filter((result) => result.title.length > 0);
    expect(withTitle.length).toBeGreaterThanOrEqual(10);

    const first = withTitle[0];
    expect(first.title.toLowerCase()).toContain('porsche');
    expect(first.url).toMatch(/car-details/);
  });
});
