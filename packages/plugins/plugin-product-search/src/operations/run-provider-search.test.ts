//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { make } from '../types/Provider';
import { buildResults } from './run-provider-search';

const HTML = '<div class="c"><h2>Item A</h2><a href="/a">x</a></div>';

describe('buildResults', () => {
  test('produces ResultData from a provider mapping + body', ({ expect }) => {
    const provider = make({
      name: 'Test',
      url: 'https://x',
      kind: 'scrape',
      request: { method: 'GET', urlTemplate: 'https://x/s' },
      result: {
        responseType: 'html',
        itemLocator: '.c',
        fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
      },
    });
    const results = buildResults(provider, HTML);
    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Item A');
  });
});
