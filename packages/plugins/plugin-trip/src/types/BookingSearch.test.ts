//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { FlightOffer, FlightSearchQuery, MissingApiKeyError } from './BookingSearch';

describe('BookingSearch', () => {
  test('decodes a flight query', ({ expect }) => {
    const query = Schema.decodeUnknownSync(FlightSearchQuery)({
      _tag: 'flight',
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2026-06-01T00:00:00.000Z',
      cabinClass: 'economy',
      passengers: 1,
    });
    expect(query.origin).toBe('JFK');
    expect(query._tag).toBe('flight');
  });

  test('decodes a flight offer', ({ expect }) => {
    const offer = Schema.decodeUnknownSync(FlightOffer)({
      _tag: 'flight',
      id: 'off_123',
      provider: 'duffel',
      carrier: { name: 'Air France', iataCode: 'AF' },
      totalAmount: 540.5,
      currency: 'USD',
      cabinClass: 'economy',
      slices: [{ origin: { code: 'JFK' }, destination: { code: 'LHR' }, flightNumber: 'AF023' }],
    });
    expect(offer.slices).toHaveLength(1);
    expect(offer.totalAmount).toBe(540.5);
  });

  test('MissingApiKeyError carries the service id', ({ expect }) => {
    const error = new MissingApiKeyError('duffel');
    expect(error.serviceId).toBe('duffel');
    expect(error).toBeInstanceOf(Error);
  });
});
