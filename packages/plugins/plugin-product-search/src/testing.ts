//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';

import { Provider, Result, Search } from './types';

/**
 * Sample {@link Provider.Provider} describing a scrape target with a small typed
 * search schema, a GET request mapping, and an HTML result mapping.
 */
export const sampleProvider: Provider.Provider = Provider.makeProvider({
  name: 'AutoTrader',
  url: 'https://www.autotrader.com',
  description: 'Used and new vehicle listings.',
  kind: 'scrape',
  searchSchema: {
    type: 'object',
    properties: {
      make: { type: 'string', title: 'Make' },
      model: { type: 'string', title: 'Model' },
      priceMax: { type: 'number', title: 'Max price' },
    },
  },
  request: {
    method: 'GET',
    urlTemplate: 'https://www.autotrader.com/cars-for-sale?make={make}&model={model}',
    query: {
      make: { field: 'make' },
      model: { field: 'model' },
      priceMax: { field: 'priceMax', transform: 'max' },
    },
  },
  result: {
    responseType: 'html',
    itemLocator: '.listing-card',
    fields: {
      title: { selector: '.listing-title' },
      url: { selector: 'a', attr: 'href' },
      price: { selector: '.listing-price' },
      image: { selector: 'img', attr: 'src' },
    },
  },
});

/**
 * Sample {@link Result.Result} objects with placeholder images and metadata.
 */
export const sampleResults: Result.Result[] = [
  Result.makeResult({
    title: '2021 Toyota Corolla LE',
    url: 'https://www.autotrader.com/cars/1',
    price: 18995,
    currency: 'USD',
    images: ['https://placehold.co/600x400?text=Corolla'],
    provider: Ref.make(sampleProvider),
    properties: { mileage: 24500, color: 'Silver' },
  }),
  Result.makeResult({
    title: '2019 Honda Civic EX',
    url: 'https://www.autotrader.com/cars/2',
    price: 17250,
    currency: 'USD',
    images: ['https://placehold.co/600x400?text=Civic'],
    provider: Ref.make(sampleProvider),
    properties: { mileage: 38900, color: 'Blue' },
  }),
  Result.makeResult({
    title: '2022 Mazda3 Select',
    url: 'https://www.autotrader.com/cars/3',
    price: 22100,
    currency: 'USD',
    images: ['https://placehold.co/600x400?text=Mazda3'],
    provider: Ref.make(sampleProvider),
    properties: { mileage: 12100, color: 'Red' },
  }),
];

/**
 * A single sample {@link Result.Result}.
 */
export const sampleResult: Result.Result = sampleResults[0];

/**
 * Sample {@link Search.Search} referencing the sample provider and results.
 */
export const sampleSearch: Search.Search = Search.makeSearch({
  name: 'Compact cars under $25k',
  providers: [Ref.make(sampleProvider)],
  criteria: { make: 'Toyota', priceMax: 25000 },
  results: sampleResults.map((result) => Ref.make(result)),
});
