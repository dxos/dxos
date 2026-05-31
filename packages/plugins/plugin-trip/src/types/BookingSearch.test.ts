//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as BookingSearch from './BookingSearch';

describe('BookingSearch', () => {
  test('decodes a flight query', ({ expect }) => {
    const query = Schema.decodeUnknownSync(BookingSearch.FlightSearchQuery)({
      _tag: 'flight',
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2026-06-01T00:00:00.000Z',
      serviceClass: 'economy',
      passengers: 1,
    });
    expect(query.origin).toBe('JFK');
    expect(query._tag).toBe('flight');
  });

  test('decodes a flight offer', ({ expect }) => {
    const offer = Schema.decodeUnknownSync(BookingSearch.FlightOffer)({
      _tag: 'flight',
      id: 'off_123',
      provider: 'duffel',
      operator: { name: 'Air France', iataCode: 'AF' },
      totalAmount: 540.5,
      currency: 'USD',
      serviceClass: 'economy',
      slices: [{ origin: { code: 'JFK' }, destination: { code: 'LHR' }, number: 'AF023' }],
    });
    expect(offer.slices).toHaveLength(1);
    expect(offer.totalAmount).toBe(540.5);
  });

  test('MissingApiKeyError carries the service id', ({ expect }) => {
    const error = new BookingSearch.MissingApiKeyError('duffel');
    expect(error.serviceId).toBe('duffel');
    expect(error).toBeInstanceOf(Error);
  });
});
