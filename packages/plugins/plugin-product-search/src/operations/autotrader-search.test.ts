//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Provider } from '../types';
import { bindRequest } from '../util';
import { buildResults } from './run-provider-search';

//
// A representative AutoTrader UK "used cars" results page (server HTML), trimmed to 10 listing
// cards with the structure the result mapping targets. Used to prove the template -> results
// pipeline deterministically (the live site is a client-rendered SPA, which is out of scope for
// v1 HTML scraping, so a fixture is used instead of a network call).
//

const card = (index: number, model: string, price: number) => `
  <div data-testid="advertCard">
    <h3>Porsche ${model}</h3>
    <a href="/car-details/${index}">view</a>
    <span data-testid="price">£${price.toLocaleString()}</span>
    <img src="https://img.autotrader.co.uk/${index}.jpg" />
  </div>`;

const AUTOTRADER_HTML = `<!doctype html><html><body><main>
  ${[
    card(1, '911 Carrera S', 89950),
    card(2, '911 Turbo S', 124000),
    card(3, '718 Cayman GT4', 78990),
    card(4, 'Panamera 4S', 52495),
    card(5, 'Macan S', 44990),
    card(6, 'Cayenne Coupe', 67995),
    card(7, '911 GT3', 159950),
    card(8, 'Taycan 4S', 71990),
    card(9, '718 Boxster', 48950),
    card(10, '911 Targa 4', 98500),
  ].join('\n')}
</main></body></html>`;

/**
 * The kind of template the provider blueprint authors for AutoTrader UK: a request mapping that
 * binds criteria to the car-search URL, and a result mapping that locates each advert card and
 * extracts its fields.
 */
const makeAutoTraderProvider = (): Provider.Provider =>
  Provider.make({
    name: 'AutoTrader UK',
    url: 'https://www.autotrader.co.uk/cars/used',
    kind: 'scrape',
    request: {
      method: 'GET',
      urlTemplate: 'https://www.autotrader.co.uk/car-search',
      query: {
        make: { field: 'make' },
        model: { field: 'model' },
        'price-to': { field: 'priceTo' },
      },
    },
    result: {
      responseType: 'html',
      itemLocator: '[data-testid="advertCard"]',
      fields: {
        title: { selector: 'h3' },
        url: { selector: 'a', attr: 'href' },
        price: { selector: '[data-testid="price"]' },
        image: { selector: 'img', attr: 'src' },
      },
    },
  });

describe('AutoTrader template -> search', () => {
  test('binds criteria to the AutoTrader search URL', ({ expect }) => {
    const provider = makeAutoTraderProvider();
    if (!provider.request) {
      throw new Error('fixture provider is missing a request mapping');
    }
    const request = bindRequest({ make: 'Porsche', model: '911', priceTo: 150000 }, provider.request);
    expect(request.method).toEqual('GET');
    expect(request.url).toEqual('https://www.autotrader.co.uk/car-search?make=Porsche&model=911&price-to=150000');
  });

  test('extracts 10 results from the AutoTrader results page using the template', ({ expect }) => {
    const provider = makeAutoTraderProvider();
    const results = buildResults(provider, AUTOTRADER_HTML);

    expect(results).toHaveLength(10);

    // Every result has the first-class fields the card/detail views render.
    for (const result of results) {
      expect(result.title).toMatch(/^Porsche /);
      expect(result.url).toMatch(/^\/car-details\/\d+$/);
      expect(result.images).toHaveLength(1);
      expect(result.properties.price).toMatch(/^£/);
    }

    expect(results[0].title).toEqual('Porsche 911 Carrera S');
    expect(results[6].title).toEqual('Porsche 911 GT3');
  });
});
