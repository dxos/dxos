//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Schema from 'effect/Schema';

import { RequestMapping, ResultMapping } from './Provider';

describe('Provider mapping schemas', () => {
  test('decodes a request mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(RequestMapping)({
      method: 'GET',
      urlTemplate: 'https://x.com/s?q={query}',
      query: { q: { field: 'query' } },
    });
    expect(value.method).toEqual('GET');
    expect(value.query?.q.field).toEqual('query');
  });

  test('decodes a result mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(ResultMapping)({
      responseType: 'html',
      itemLocator: '.listing',
      fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
    });
    expect(value.itemLocator).toEqual('.listing');
    expect(value.fields.title.selector).toEqual('h2');
  });
});
