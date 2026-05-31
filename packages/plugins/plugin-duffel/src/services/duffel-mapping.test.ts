//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BookingSearch } from '@dxos/plugin-trip';

import { offerRequestBody, parseOffers } from './duffel-mapping';

const QUERY: BookingSearch.FlightSearchQuery = {
  _tag: 'flight',
  origin: 'JFK',
  destination: 'LHR',
  departureDate: '2026-06-01T18:00:00.000Z',
  returnDate: undefined,
  cabinClass: 'premium',
  passengers: 2,
};

const DUFFEL_RESPONSE = {
  data: {
    offers: [
      {
        id: 'off_123',
        total_amount: '540.50',
        total_currency: 'USD',
        owner: { name: 'Air France', iata_code: 'AF' },
        slices: [
          {
            segments: [
              {
                origin: { iata_code: 'JFK', name: 'New York JFK' },
                destination: { iata_code: 'LHR', name: 'London Heathrow' },
                departing_at: '2026-06-01T18:00:00',
                arriving_at: '2026-06-02T06:00:00',
                marketing_carrier: { iata_code: 'AF' },
                marketing_carrier_flight_number: '023',
                duration: 'PT7H30M',
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('duffel-mapping', () => {
  test('builds an offer-request body, mapping premium -> premium_economy and a date-only departure', ({ expect }) => {
    const body = offerRequestBody(QUERY);
    expect(body.data.slices).toEqual([{ origin: 'JFK', destination: 'LHR', departure_date: '2026-06-01' }]);
    expect(body.data.passengers).toEqual([{ type: 'adult' }, { type: 'adult' }]);
    expect(body.data.cabin_class).toBe('premium_economy');
  });

  test('parses Duffel offers into FlightOffer[]', ({ expect }) => {
    const offers = parseOffers(DUFFEL_RESPONSE);
    expect(offers).toHaveLength(1);
    const offer = offers[0];
    expect(offer._tag).toBe('flight');
    expect(offer.id).toBe('off_123');
    expect(offer.provider).toBe('duffel');
    expect(offer.carrier).toEqual({ name: 'Air France', iataCode: 'AF' });
    expect(offer.totalAmount).toBe(540.5);
    expect(offer.currency).toBe('USD');
    expect(offer.slices).toHaveLength(1);
    expect(offer.slices[0]).toMatchObject({
      origin: { code: 'JFK', name: 'New York JFK' },
      destination: { code: 'LHR', name: 'London Heathrow' },
      marketingCarrier: 'AF',
      flightNumber: '023',
      durationMinutes: 450,
    });
  });
});
