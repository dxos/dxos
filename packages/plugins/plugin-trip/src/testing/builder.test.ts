//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PLACES, TripBuilder } from './builder';

describe('TripBuilder', () => {
  // The sequence `TripArticle`'s Default story seeds: five flights and two trains, the shape that
  // renders nothing in Storybook while the other stories render.
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
        daysFromNow: 2,
        durationHours: 1,
        airline: { name: 'Air France', code: 'AF' },
        confirmed: true,
      })
      .addTrain({
        from: PLACES.LTV,
        to: PLACES.EUS,
        daysFromNow: 4,
        operator: { name: 'Avanti West Coast' },
        trainNumber: 'VT 210',
      })
      .addTrain({
        from: PLACES.STP,
        to: PLACES.PAR_NORD,
        daysFromNow: 5,
        operator: { name: 'Eurostar' },
        trainNumber: 'ES 9024',
      })
      .addFlight({ from: PLACES.CDG, to: PLACES.SIN, daysFromNow: 7, durationHours: 13 })
      .addFlight({ from: PLACES.SIN, to: PLACES.CDG, daysFromNow: 12, durationHours: 13 })
      .addFlight({ from: PLACES.CDG, to: PLACES.JFK, daysFromNow: 14, durationHours: 8 })
      .build('Paris · Singapore (via the UK)');

    expect(segments).toHaveLength(7);
    expect(bookings).toHaveLength(2);
    expect(trip.name).toBe('Paris · Singapore (via the UK)');
  });

  test('every place the Default story names is defined', () => {
    for (const key of ['JFK', 'CDG', 'BHX', 'LTV', 'EUS', 'STP', 'PAR_NORD', 'SIN']) {
      expect(PLACES[key], key).toBeDefined();
    }
  });
});
