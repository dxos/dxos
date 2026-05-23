//
// Copyright 2026 DXOS.org
//

import { addDays, addHours, startOfDay } from 'date-fns';

import { Booking, Segment, Trip } from '#types';

export type TripBuilderResult = {
  trip: Trip.Trip;
  segments: Segment.Segment[];
  bookings: Booking.Booking[];
};

/**
 * Test helper for assembling a Trip with a sequence of segments and matching bookings.
 * Methods chain. Call build() to produce the Trip plus the Segments and Bookings
 * that callers should add to the database alongside it (the build sets each
 * segment's parent to the trip).
 */
export class TripBuilder {
  readonly #now = new Date();
  readonly #segments: Segment.Segment[] = [];
  readonly #bookings: Booking.Booking[] = [];

  addFlight(daysFromNow = 0, opts: { confirmed?: boolean } = {}): this {
    const depart = addHours(startOfDay(addDays(this.#now, daysFromNow)), 10);
    const arrive = addHours(depart, 11);
    if (opts.confirmed) {
      this.#bookings.push(
        Booking.make({
          provider: { name: 'United Airlines' },
          confirmationCode: `UA${100 + this.#segments.length + 1}`,
          source: 'manual',
        }),
      );
    }
    this.#segments.push(
      Segment.make({
        kind: 'flight',
        status: opts.confirmed ? 'confirmed' : 'tentative',
        airline: { name: 'United Airlines' },
        flightNumber: `UA ${900 + this.#segments.length + 1}`,
        cabin: 'economy',
        origin: { name: 'San Francisco Intl', code: 'SFO', city: 'San Francisco', geo: [-122.379, 37.6213] },
        destination: { name: 'London Heathrow', code: 'LHR', city: 'London', geo: [-0.4543, 51.4706] },
        departAt: depart.toISOString(),
        arriveAt: arrive.toISOString(),
      }),
    );
    return this;
  }

  addHotel(checkInDaysFromNow = 1, nights = 3): this {
    const checkIn = startOfDay(addDays(this.#now, checkInDaysFromNow));
    const checkOut = addDays(checkIn, nights);
    this.#segments.push(
      Segment.make({
        kind: 'lodging',
        status: 'confirmed',
        propertyName: 'The Grand Hotel',
        operator: { name: 'Marriott' },
        origin: { name: 'The Grand Hotel', city: 'London', geo: [-0.1276, 51.5074] },
        destination: { name: 'The Grand Hotel', city: 'London', geo: [-0.1276, 51.5074] },
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        departAt: checkIn.toISOString(),
        arriveAt: checkOut.toISOString(),
      }),
    );
    return this;
  }

  addActivity(daysFromNow = 2): this {
    const start = addHours(startOfDay(addDays(this.#now, daysFromNow)), 14);
    this.#segments.push(
      Segment.make({
        kind: 'activity',
        status: 'confirmed',
        title: 'Tower of London Tour',
        venue: { name: 'Tower of London', city: 'London', geo: [-0.0759, 51.5081] },
        departAt: start.toISOString(),
      }),
    );
    return this;
  }

  build(name = 'My Trip'): TripBuilderResult {
    const trip = Trip.make({ name });
    for (const segment of this.#segments) {
      Trip.addSegment(trip, segment);
    }
    return {
      trip,
      segments: [...this.#segments],
      bookings: [...this.#bookings],
    };
  }
}
