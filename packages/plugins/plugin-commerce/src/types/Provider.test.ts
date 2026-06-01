//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Provider from './Provider';

describe('Provider type', () => {
  test('make + instanceOf', ({ expect }) => {
    const provider = Provider.make({ name: 'AutoTrader', url: 'https://autotrader.com', kind: 'scrape' });
    expect(Provider.instanceOf(provider)).toBe(true);
    expect(provider.name).toEqual('AutoTrader');
    expect(provider.kind).toEqual('scrape');
  });
});

describe('Provider mapping schemas', () => {
  test('decodes a request mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(Provider.RequestMapping)({
      method: 'GET',
      urlTemplate: 'https://x.com/s?q={query}',
      query: { q: { field: 'query' } },
    });
    expect(value.method).toEqual('GET');
    expect(value.query?.q.field).toEqual('query');
  });

  test('decodes a result mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(Provider.ResultMapping)({
      responseType: 'html',
      itemLocator: '.listing',
      fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
    });
    expect(value.itemLocator).toEqual('.listing');
    expect(value.fields.title.selector).toEqual('h2');
  });
});
