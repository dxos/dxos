//
// Copyright 2026 DXOS.org
//

import { addDays, addHours, startOfDay } from 'date-fns';

import { Booking, Place, Segment, Trip } from '#types';

type PlaceType = Place.Place;

export type TripBuilderResult = {
  trip: Trip.Trip;
  segments: Segment.Segment[];
  bookings: Booking.Booking[];
};

/** Common airports / stations used across stories — Place shape. */
export const PLACES: Record<string, PlaceType> = {
  JFK: { name: 'John F. Kennedy Intl', code: 'JFK', city: 'New York', country: 'US', geo: [-73.7781, 40.6413] },
  SFO: { name: 'San Francisco Intl', code: 'SFO', city: 'San Francisco', country: 'US', geo: [-122.379, 37.6213] },
  LHR: { name: 'London Heathrow', code: 'LHR', city: 'London', country: 'GB', geo: [-0.4543, 51.4706] },
  CDG: { name: 'Paris-Charles de Gaulle', code: 'CDG', city: 'Paris', country: 'FR', geo: [2.5479, 49.0097] },
  BHX: { name: 'Birmingham Airport', code: 'BHX', city: 'Birmingham', country: 'GB', geo: [-1.748, 52.4539] },
  SIN: { name: 'Singapore Changi', code: 'SIN', city: 'Singapore', country: 'SG', geo: [103.9915, 1.3644] },
  LTV: { name: 'Lichfield Trent Valley', code: 'LTV', city: 'Lichfield', country: 'GB', geo: [-1.8044, 52.6841] },
  EUS: { name: 'London Euston', code: 'EUS', city: 'London', country: 'GB', geo: [-0.1335, 51.5285] },
  STP: { name: 'London St Pancras International', code: 'STP', city: 'London', country: 'GB', geo: [-0.1264, 51.532] },
  PAR_NORD: { name: 'Paris Gare du Nord', code: 'PAR', city: 'Paris', country: 'FR', geo: [2.3553, 48.8809] },
};

type FlightOptions = {
  from: PlaceType;
  to: PlaceType;
  daysFromNow?: number;
  departHour?: number;
  durationHours?: number;
  airline?: { name?: string; code?: string };
  flightNumber?: string;
  cabin?: Segment.ServiceClass;
  confirmed?: boolean;
};

type TrainOptions = {
  from: PlaceType;
  to: PlaceType;
  daysFromNow?: number;
  departHour?: number;
  durationHours?: number;
  operator?: { name?: string };
  trainNumber?: string;
};

type HotelOptions = {
  propertyName?: string;
  chain?: string;
  place: PlaceType;
  checkInDaysFromNow?: number;
  nights?: number;
};

type ActivityOptions = {
  title: string;
  venue?: PlaceType;
  daysFromNow?: number;
  departHour?: number;
};

/**
 * Test helper for assembling a Trip with a sequence of segments and matching
 * bookings. Methods chain. Each method has an opt-less overload that keeps the
 * Phase 1 default (SFO → LHR / London Grand Hotel / Tower of London Tour) so
 * existing stories aren't broken; passing an options object lets newer stories
 * model arbitrary itineraries.
 */
export class TripBuilder {
  readonly #now = new Date();
  readonly #segments: Segment.Segment[] = [];
  readonly #bookings: Booking.Booking[] = [];

  addFlight(): this;
  addFlight(daysFromNow: number, opts?: { confirmed?: boolean }): this;
  addFlight(opts: FlightOptions): this;
  addFlight(arg?: number | FlightOptions, legacyOpts?: { confirmed?: boolean }): this {
    const opts: FlightOptions =
      typeof arg === 'object'
        ? arg
        : {
            from: PLACES.JFK,
            to: PLACES.CDG,
            daysFromNow: arg ?? 0,
            airline: { name: 'Air France' },
            cabin: 'economy',
            confirmed: legacyOpts?.confirmed,
          };

    const daysFromNow = opts.daysFromNow ?? 0;
    const departHour = opts.departHour ?? 10;
    const durationHours = opts.durationHours ?? 11;
    const depart = addHours(startOfDay(addDays(this.#now, daysFromNow)), departHour);
    const arrive = addHours(depart, durationHours);
    const index = this.#segments.length + 1;
    const airline = opts.airline ?? { name: 'Some Airline' };
    const code = opts.airline?.code ?? 'XX';
    const flightNumber = opts.flightNumber ?? `${code} ${900 + index}`;

    if (opts.confirmed) {
      this.#bookings.push(
        Booking.make({
          provider: { name: airline.name },
          confirmationCode: `${code}${100 + index}`,
          source: 'manual',
        }),
      );
    }
    this.#segments.push(
      Segment.make({
        details: {
          _tag: 'flight',
          provider: airline,
          number: flightNumber,
          serviceClass: opts.cabin ?? 'economy',
          origin: opts.from,
          destination: opts.to,
          departAt: depart.toISOString(),
          arriveAt: arrive.toISOString(),
        },
      }),
    );
    return this;
  }

  addTrain(opts: TrainOptions): this {
    const daysFromNow = opts.daysFromNow ?? 0;
    const departHour = opts.departHour ?? 9;
    const durationHours = opts.durationHours ?? 2;
    const depart = addHours(startOfDay(addDays(this.#now, daysFromNow)), departHour);
    const arrive = addHours(depart, durationHours);
    this.#segments.push(
      Segment.make({
        details: {
          _tag: 'train',
          provider: opts.operator,
          number: opts.trainNumber,
          origin: opts.from,
          destination: opts.to,
          departAt: depart.toISOString(),
          arriveAt: arrive.toISOString(),
        },
      }),
    );
    return this;
  }

  addHotel(): this;
  addHotel(checkInDaysFromNow: number, nights?: number): this;
  addHotel(opts: HotelOptions): this;
  addHotel(arg?: number | HotelOptions, legacyNights?: number): this {
    const opts: HotelOptions =
      typeof arg === 'object'
        ? arg
        : {
            propertyName: 'The Grand Hotel',
            chain: 'Marriott',
            place: { name: 'The Grand Hotel', city: 'London', geo: [-0.1276, 51.5074] },
            checkInDaysFromNow: arg ?? 1,
            nights: legacyNights ?? 3,
          };

    const checkInDaysFromNow = opts.checkInDaysFromNow ?? 1;
    const nights = opts.nights ?? 3;
    const checkIn = startOfDay(addDays(this.#now, checkInDaysFromNow));
    const checkOut = addDays(checkIn, nights);
    this.#segments.push(
      Segment.make({
        details: {
          _tag: 'accommodation',
          propertyName: opts.propertyName,
          location: opts.place,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
        },
      }),
    );
    return this;
  }

  addActivity(): this;
  addActivity(daysFromNow: number): this;
  addActivity(opts: ActivityOptions): this;
  addActivity(arg?: number | ActivityOptions): this {
    const opts: ActivityOptions =
      typeof arg === 'object'
        ? arg
        : {
            title: 'Tower of London Tour',
            venue: { name: 'Tower of London', city: 'London', geo: [-0.0759, 51.5081] },
            daysFromNow: arg ?? 2,
          };

    const daysFromNow = opts.daysFromNow ?? 0;
    const departHour = opts.departHour ?? 14;
    const start = addHours(startOfDay(addDays(this.#now, daysFromNow)), departHour);
    this.#segments.push(
      Segment.make({
        details: {
          _tag: 'activity',
          title: opts.title,
          venue: opts.venue,
          departAt: start.toISOString(),
        },
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
