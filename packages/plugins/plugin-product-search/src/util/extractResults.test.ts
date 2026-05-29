//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractResults } from './extractResults';

const HTML = `
  <div class="listing">
    <h2 class="t">Porsche 911</h2>
    <a class="l" href="/cars/1">link</a>
    <span class="p">120000</span>
    <img class="img" src="https://img/1.jpg" />
  </div>
  <div class="listing">
    <h2 class="t">Porsche 992</h2>
    <a class="l" href="/cars/2">link</a>
    <span class="p">140000</span>
  </div>
`;

describe('extractResults', () => {
  test('extracts html listings', ({ expect }) => {
    const results = extractResults(HTML, {
      responseType: 'html',
      itemLocator: '.listing',
      fields: {
        title: { selector: '.t' },
        url: { selector: '.l', attr: 'href' },
        price: { selector: '.p' },
        image: { selector: '.img', attr: 'src' },
      },
    });
    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Porsche 911');
    expect(results[0].url).toEqual('/cars/1');
    expect(results[0].properties.price).toEqual('120000');
    expect(results[0].images).toEqual(['https://img/1.jpg']);
    expect(results[1].images).toEqual([]);
  });

  test('extracts json listings via dotted path', ({ expect }) => {
    const json = JSON.stringify({ items: [{ name: 'A', link: 'https://a' }] });
    const results = extractResults(json, {
      responseType: 'json',
      itemLocator: 'items',
      fields: { title: { path: 'name' }, url: { path: 'link' } },
    });
    expect(results[0].title).toEqual('A');
    expect(results[0].url).toEqual('https://a');
  });
});
