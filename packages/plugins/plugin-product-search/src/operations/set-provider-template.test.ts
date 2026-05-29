//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeProvider } from '../types/Provider';
import { applyProviderTemplate } from './set-provider-template';

describe('applyProviderTemplate', () => {
  test('writes the derived search schema, request, and result onto the provider', ({ expect }) => {
    const provider = makeProvider({ name: 'Test', url: 'https://x', kind: 'scrape' });

    applyProviderTemplate(provider, {
      searchSchema: { type: 'object', properties: { q: { type: 'string' } } },
      request: { method: 'GET', urlTemplate: 'https://x/s', query: { q: { field: 'q' } } },
      result: {
        responseType: 'html',
        itemLocator: '.c',
        fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
      },
    });

    expect(provider.searchSchema).toEqual({ type: 'object', properties: { q: { type: 'string' } } });
    expect(provider.request?.urlTemplate).toEqual('https://x/s');
    expect(provider.result?.itemLocator).toEqual('.c');
  });
});
