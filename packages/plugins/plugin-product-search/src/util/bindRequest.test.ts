//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { bindRequest } from './bindRequest';

describe('bindRequest', () => {
  test('substitutes url template tokens and query bindings', ({ expect }) => {
    const req = bindRequest(
      { make: 'Porsche', model: '911' },
      {
        method: 'GET',
        urlTemplate: 'https://x.com/{make}',
        query: { q: { field: 'model' } },
      },
    );
    expect(req.url).toEqual('https://x.com/Porsche?q=911');
    expect(req.method).toEqual('GET');
  });

  test('maps a range field via min/max transforms', ({ expect }) => {
    const req = bindRequest(
      { price: { min: 100000, max: 150000 } },
      {
        method: 'GET',
        urlTemplate: 'https://x.com/s',
        query: { priceFrom: { field: 'price', transform: 'min' }, priceTo: { field: 'price', transform: 'max' } },
      },
    );
    expect(req.url).toEqual('https://x.com/s?priceFrom=100000&priceTo=150000');
  });

  test('omits query params whose field is absent', ({ expect }) => {
    const req = bindRequest(
      { make: 'BMW' },
      { method: 'GET', urlTemplate: 'https://x.com/s', query: { q: { field: 'missing' } } },
    );
    expect(req.url).toEqual('https://x.com/s');
  });
});
