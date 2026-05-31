//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

import * as Segment from './Segment';

/**
 * Transient search/offer types shared by plugin-trip and booking-service
 * implementations (e.g. plugin-duffel). These are NOT ECHO objects — they are
 * plain Effect schemas passed across the BookingService capability boundary.
 *
 * The shape mirrors `Segment`: a shared field mixin (`FlightSearchFields`)
 * extended into a tagged variant (`FlightSearchQuery`), discriminated by the
 * same `Segment.Kind` literal so non-flight kinds (train, accommodation, …)
 * can be added later as additional tagged members with no signature changes.
 */

/** Shared query fields (parallels `Segment.TransportFields`). Used directly as the input-form schema. */
export const FlightSearchFields = Schema.Struct({
  origin: Schema.optional(Schema.String.annotations({ title: 'Origin', description: 'IATA code', examples: ['JFK'] })),
  destination: Schema.optional(
    Schema.String.annotations({ title: 'Destination', description: 'IATA code', examples: ['LHR'] }),
  ),
  departureDate: Schema.optional(Format.DateTime.annotations({ title: 'Departure' })),
  returnDate: Schema.optional(Format.DateTime.annotations({ title: 'Return' })),
  cabinClass: Schema.optional(Segment.ServiceClass),
  carrier: Schema.optional(Schema.String.annotations({ title: 'Carrier', description: 'Preferred airline IATA code' })),
  passengers: Schema.optional(Schema.Number.annotations({ title: 'Passengers' })),
});
export interface FlightSearchFields extends Schema.Schema.Type<typeof FlightSearchFields> {}

export const FlightSearchQuery = Schema.extend(FlightSearchFields, Schema.TaggedStruct('flight', {}));
export interface FlightSearchQuery extends Schema.Schema.Type<typeof FlightSearchQuery> {}

/** Discriminated union of all query kinds. Today only `flight` is populated. */
export const SearchQuery = Schema.Union(FlightSearchQuery);
export type SearchQuery = Schema.Schema.Type<typeof SearchQuery>;

/** A single leg within an offer. */
export const FlightSliceFields = Schema.Struct({
  origin: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  destination: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  departAt: Schema.optional(Format.DateTime),
  arriveAt: Schema.optional(Format.DateTime),
  marketingCarrier: Schema.optional(Schema.String),
  flightNumber: Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Number),
});
export interface FlightSliceFields extends Schema.Schema.Type<typeof FlightSliceFields> {}

export const FlightOffer = Schema.TaggedStruct('flight', {
  id: Schema.String,
  provider: Schema.String,
  carrier: Schema.Struct({ name: Schema.String, iataCode: Schema.optional(Schema.String) }),
  totalAmount: Schema.Number,
  currency: Schema.String,
  cabinClass: Schema.optional(Segment.ServiceClass),
  slices: Schema.Array(FlightSliceFields),
});
export interface FlightOffer extends Schema.Schema.Type<typeof FlightOffer> {}

/** Discriminated union of all offer kinds. Today only `flight` is populated. */
export const Offer = Schema.Union(FlightOffer);
export type Offer = Schema.Schema.Type<typeof Offer>;

/**
 * A pluggable booking provider. Plugins contribute implementations via the
 * `TripCapabilities.BookingService` capability; plugin-trip resolves all of them.
 */
export interface BookingService {
  readonly id: string;
  readonly label: string;
  readonly kinds: readonly Segment.Kind[];
  search(query: SearchQuery): Promise<readonly Offer[]>;
}

/** Thrown by a `BookingService` when its credentials are not configured. */
export class MissingApiKeyError extends Error {
  constructor(public readonly serviceId: string) {
    super(`Missing API key for booking service: ${serviceId}`);
    this.name = 'MissingApiKeyError';
  }
}
