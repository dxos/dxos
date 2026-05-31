//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BookingSearch } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

const OFFER: BookingSearch.FlightOffer = {
  _tag: 'flight',
  id: 'off_123',
  provider: 'duffel',
  carrier: { name: 'Air France', iataCode: 'AF' },
  totalAmount: 540.5,
  currency: 'USD',
  cabinClass: 'economy',
  slices: [
    {
      origin: { code: 'JFK', name: 'New York JFK' },
      destination: { code: 'CDG', name: 'Paris CDG' },
      departAt: '2026-06-01T18:00:00.000Z',
      arriveAt: '2026-06-02T07:00:00.000Z',
      marketingCarrier: 'AF',
      flightNumber: '023',
      durationMinutes: 420,
    },
    {
      origin: { code: 'CDG' },
      destination: { code: 'LHR' },
      departAt: '2026-06-02T09:00:00.000Z',
      arriveAt: '2026-06-02T09:30:00.000Z',
      marketingCarrier: 'AF',
      flightNumber: '1680',
    },
  ],
};

describe('offer-to-segment', () => {
  test('maps offer to flight details using first and last leg', ({ expect }) => {
    const details = offerToFlightDetails(OFFER);
    expect(details._tag).toBe('flight');
    expect(details.origin?.code).toBe('JFK');
    expect(details.destination?.code).toBe('LHR');
    expect(details.departAt).toBe('2026-06-01T18:00:00.000Z');
    expect(details.arriveAt).toBe('2026-06-02T09:30:00.000Z');
    expect(details.number).toBe('AF023');
    expect(details.provider?.name).toBe('Air France');
    expect(details.serviceClass).toBe('economy');
  });

  test('maps offer to booking props with raw payload', ({ expect }) => {
    const props = offerToBookingProps(OFFER);
    expect(props.provider?.name).toBe('Air France');
    expect(props.currency).toBe('USD');
    expect(props.totalPrice).toBe(540.5);
    expect(props.source).toBe('import');
    expect(JSON.parse(props.rawPayload!).id).toBe('off_123');
  });
});
