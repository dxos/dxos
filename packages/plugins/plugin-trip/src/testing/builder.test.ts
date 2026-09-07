//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PLACES, TripBuilder } from './builder';

describe('TripBuilder', () => {
  // Mirrors `TripArticle`'s Default story seed exactly, down to the airline codes and `confirmed`
  // flags: a weaker fixture here would pass while the story's own inputs still threw.
  test('builds the Default story trip', () => {
    const { trip, segments, bookings } = new TripBuilder()
      .addFlight({
        from: PLACES.JFK,
        to: PLACES.CDG,
        daysFromNow: 0,
        durationHours: 7,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 023',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.BHX,
        daysFromNow: 1,
        departHour: 13,
        durationHours: 1,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 1268',
        cabin: 'economy',
        confirmed: true,
      })
      .addTrain({
        from: PLACES.LTV,
        to: PLACES.EUS,
        daysFromNow: 4,
        departHour: 9,
        durationHours: 1,
        operator: { name: 'Trainline' },
        trainNumber: 'TL 9F32',
      })
      .addTrain({
        from: PLACES.STP,
        to: PLACES.PAR_NORD,
        daysFromNow: 4,
        departHour: 11,
        durationHours: 3,
        operator: { name: 'Eurostar' },
        trainNumber: 'ES 9024',
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.SIN,
        daysFromNow: 5,
        departHour: 20,
        durationHours: 13,
        airline: { name: 'Singapore Airlines', code: 'SQ' },
        flightNumber: 'SQ 333',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.SIN,
        to: PLACES.CDG,
        daysFromNow: 12,
        departHour: 23,
        durationHours: 13,
        airline: { name: 'Singapore Airlines', code: 'SQ' },
        flightNumber: 'SQ 334',
        cabin: 'business',
        confirmed: true,
      })
      .addFlight({
        from: PLACES.CDG,
        to: PLACES.JFK,
        daysFromNow: 14,
        departHour: 10,
        durationHours: 8,
        airline: { name: 'Air France', code: 'AF' },
        flightNumber: 'AF 006',
        cabin: 'business',
        confirmed: true,
      })
      .build('Paris · Singapore (via the UK)');

    expect(segments).toHaveLength(7);
    expect(bookings).toHaveLength(5);
    expect(trip.name).toBe('Paris · Singapore (via the UK)');
  });

  test('every place the Default story names is defined', () => {
    for (const key of ['JFK', 'CDG', 'BHX', 'LTV', 'EUS', 'STP', 'PAR_NORD', 'SIN']) {
      expect(PLACES[key], key).toBeDefined();
    }
  });
});
