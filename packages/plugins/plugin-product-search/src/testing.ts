//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';

import { Provider, Result, Search } from './types';

//
// Factories — return FRESH objects on each call. Stories that add objects to a space MUST use
// these (an ECHO object can only belong to one database, so re-adding a shared singleton across
// story remounts throws "Object already belongs to another database").
//

/**
 * Creates a sample {@link Provider.Provider} for the AutoTrader UK used-car listings: a scrape
 * target with a typed search schema, a GET request mapping, and an HTML result mapping.
 */
export const makeSampleProvider = (): Provider.Provider =>
  Provider.make({
    name: 'AutoTrader UK',
    url: 'https://www.autotrader.co.uk/cars/used',
    description: 'Used vehicle listings (AutoTrader UK).',
    kind: 'scrape',
    searchSchema: {
      type: 'object',
      properties: {
        make: { type: 'string', title: 'Make' },
        model: { type: 'string', title: 'Model' },
        postcode: { type: 'string', title: 'Postcode' },
        priceFrom: { type: 'number', title: 'Price from (£)' },
        priceTo: { type: 'number', title: 'Price to (£)' },
        yearFrom: { type: 'number', title: 'Year from' },
        maxMileage: { type: 'number', title: 'Max mileage' },
      },
    },
    request: {
      method: 'GET',
      urlTemplate: 'https://www.autotrader.co.uk/car-search',
      query: {
        make: { field: 'make' },
        model: { field: 'model' },
        postcode: { field: 'postcode' },
        'price-from': { field: 'priceFrom' },
        'price-to': { field: 'priceTo' },
        'year-from': { field: 'yearFrom' },
        'maximum-mileage': { field: 'maxMileage' },
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

/** Creates fresh sample {@link Result.Result} objects (AutoTrader UK used cars) linked to `provider`. */
export const makeSampleResults = (provider: Provider.Provider): Result.Result[] => [
  Result.makeResult({
    title: '2020 Porsche 911 Carrera S',
    url: 'https://www.autotrader.co.uk/car-details/1',
    price: 89950,
    currency: 'GBP',
    images: ['https://placehold.co/600x400?text=911+Carrera'],
    provider: Ref.make(provider),
    properties: { mileage: 18200, year: 2020, location: 'London' },
  }),
  Result.makeResult({
    title: '2019 Porsche 911 Turbo S',
    url: 'https://www.autotrader.co.uk/car-details/2',
    price: 124000,
    currency: 'GBP',
    images: ['https://placehold.co/600x400?text=911+Turbo+S'],
    provider: Ref.make(provider),
    properties: { mileage: 9500, year: 2019, location: 'Manchester' },
  }),
  Result.makeResult({
    title: '2021 Porsche 718 Cayman GT4',
    url: 'https://www.autotrader.co.uk/car-details/3',
    price: 78990,
    currency: 'GBP',
    images: ['https://placehold.co/600x400?text=Cayman+GT4'],
    provider: Ref.make(provider),
    properties: { mileage: 6400, year: 2021, location: 'Bristol' },
  }),
  Result.makeResult({
    title: '2018 Porsche Panamera 4S',
    url: 'https://www.autotrader.co.uk/car-details/4',
    price: 52495,
    currency: 'GBP',
    images: ['https://placehold.co/600x400?text=Panamera+4S'],
    provider: Ref.make(provider),
    properties: { mileage: 31000, year: 2018, location: 'Leeds' },
  }),
];

/** Creates a fresh sample {@link Search.Search} referencing `provider` and `results`. */
export const makeSampleSearch = (provider: Provider.Provider, results: Result.Result[]): Search.Search =>
  Search.make({
    name: 'Porsche 911 under £150k',
    providers: [Ref.make(provider)],
    criteria: { make: 'Porsche', model: '911', priceTo: 150000 },
    results: results.map((result) => Ref.make(result)),
  });

//
// Singletons — for presentational stories that render a fixture as a prop WITHOUT adding it to a
// database. Never pass these to `db.add()` (use the factories above for that).
//

export const sampleProvider: Provider.Provider = makeSampleProvider();

export const sampleResults: Result.Result[] = makeSampleResults(sampleProvider);

export const sampleResult: Result.Result = sampleResults[0];

export const sampleSearch: Search.Search = makeSampleSearch(sampleProvider, sampleResults);
