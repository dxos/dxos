//
// Copyright 2026 DXOS.org
//

import { addDays, addHours, startOfDay } from 'date-fns';

import { Booking, Segment, Trip } from '#types';

export type TripBuilderResult = {
  trip: Trip.Trip;
  bookings: Booking.Booking[];
};

/**
 * Test helper for assembling a Trip with a sequence of segments and matching bookings.
 * Methods chain. Call build() to produce the Trip object plus any Booking objects
 * that callers should add to the database alongside it.
 */
export class TripBuilder {
  readonly #now = new Date();
  readonly #segments: Segment.Any[] = [];
  readonly #bookings: Booking.Booking[] = [];
  #counter = 0;

  #nextId(): string {
    return `seg-${++this.#counter}`;
  }

  addFlight(daysFromNow = 0, opts: { confirmed?: boolean } = {}): this {
    const depart = addHours(startOfDay(addDays(this.#now, daysFromNow)), 10);
    const arrive = addHours(depart, 11);
    if (opts.confirmed) {
      this.#bookings.push(
        Booking.make({
          provider: { name: 'United Airlines' },
          confirmationCode: `UA${100 + this.#counter}`,
          source: 'manual',
        }),
      );
    }
    this.#segments.push({
      _tag: 'flight',
      id: this.#nextId(),
      status: opts.confirmed ? 'confirmed' : 'tentative',
      airline: { name: 'United Airlines' },
      flightNumber: `UA ${900 + this.#counter}`,
      cabin: 'economy',
      origin: { name: 'San Francisco Intl', code: 'SFO', city: 'San Francisco' },
      destination: { name: 'London Heathrow', code: 'LHR', city: 'London' },
      departAt: depart.toISOString(),
      arriveAt: arrive.toISOString(),
    });
    return this;
  }

  addHotel(checkInDaysFromNow = 1, nights = 3): this {
    const checkIn = startOfDay(addDays(this.#now, checkInDaysFromNow));
    const checkOut = addDays(checkIn, nights);
    this.#segments.push({
      _tag: 'lodging',
      id: this.#nextId(),
      status: 'confirmed',
      propertyName: 'The Grand Hotel',
      operator: { name: 'Marriott' },
      origin: { name: 'The Grand Hotel', city: 'London' },
      destination: { name: 'The Grand Hotel', city: 'London' },
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      departAt: checkIn.toISOString(),
      arriveAt: checkOut.toISOString(),
    });
    return this;
  }

  addActivity(daysFromNow = 2): this {
    const start = addHours(startOfDay(addDays(this.#now, daysFromNow)), 14);
    this.#segments.push({
      _tag: 'activity',
      id: this.#nextId(),
      status: 'confirmed',
      title: 'Tower of London Tour',
      venue: { name: 'Tower of London', city: 'London' },
      departAt: start.toISOString(),
    });
    return this;
  }

  build(name = 'My Trip'): TripBuilderResult {
    return {
      trip: Trip.make({ name, segments: [...this.#segments] }),
      bookings: [...this.#bookings],
    };
  }
}
