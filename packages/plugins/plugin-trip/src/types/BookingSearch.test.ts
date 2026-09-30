//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as BookingSearch from './BookingSearch.ts';
import * as Routing from './Routing.ts';

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

  test('isFailure matches every booking failure and nothing else', ({ expect }) => {
    expect(BookingSearch.isFailure(new BookingSearch.MissingApiKeyError('duffel'))).toBe(true);
    expect(BookingSearch.isFailure(new BookingSearch.BookingProviderError('duffel', 'past departure'))).toBe(true);
    expect(BookingSearch.isFailure(new Error('boom'))).toBe(false);
    expect(BookingSearch.isFailure('boom')).toBe(false);
  });

  test('a booking key failure is not a routing key failure', ({ expect }) => {
    // Both classes are called `MissingApiKeyError`, and `BaseError.is` compares names, so they
    // would match each other if they shared a tag.
    const booking = new BookingSearch.MissingApiKeyError('duffel');
    const routing = new Routing.MissingApiKeyError('mapbox');
    expect(Routing.isFailure(booking)).toBe(false);
    expect(BookingSearch.isFailure(routing)).toBe(false);
    expect(booking.name).not.toBe(routing.name);
  });
});
