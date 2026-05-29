//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { Provider } from '@dxos/types';

import * as Booking from './Booking';
import { Place } from './Place';

//
// Enums
//

export const Kind = Schema.Literal('flight', 'train', 'boat', 'road', 'accommodation', 'activity');
export type Kind = Schema.Schema.Type<typeof Kind>;

export const RoadSubKind = Schema.Literal('bus', 'car', 'transfer', 'taxi', 'walk');
export type RoadSubKind = Schema.Schema.Type<typeof RoadSubKind>;

export const ServiceClass = Schema.Literal('economy', 'premium', 'business', 'first');
export type ServiceClass = Schema.Schema.Type<typeof ServiceClass>;

//
// Variant details — discriminated by `_tag`.
//

/**
 * Shared fields for any leg that moves between two places at scheduled times.
 * Transport variants extend this via `Schema.extend`.
 */
export const TransportFields = Schema.Struct({
  /** Operator of the leg: airline for flights, rail operator for trains, ferry line for boats, road operator for taxi/bus. */
  provider: Schema.optional(Provider.Provider).annotations({ title: 'Operator' }),
  /** Operator-assigned identifier: flight number, train number, vessel/route code. */
  number: Schema.optional(Schema.String).annotations({ title: 'Number' }),
  origin: Schema.optional(Place).annotations({ title: 'Origin' }),
  destination: Schema.optional(Place).annotations({ title: 'Destination' }),
  departAt: Schema.optional(Format.DateTime).annotations({ title: 'Depart' }),
  arriveAt: Schema.optional(Format.DateTime).annotations({ title: 'Arrive' }),
  serviceClass: Schema.optional(ServiceClass).annotations({ title: 'Class' }),
  /** Single seat assignment, or a list when the booking covers multiple passengers. */
  seat: Schema.optional(Schema.Union(Schema.String, Schema.Array(Schema.String))).annotations({ title: 'Seat' }),
});
export interface TransportFields extends Schema.Schema.Type<typeof TransportFields> {}

export const FlightDetails = Schema.extend(
  TransportFields,
  Schema.TaggedStruct('flight', {
    terminalFrom: Schema.optional(Schema.String).annotations({ title: 'Departure terminal' }),
    terminalTo: Schema.optional(Schema.String).annotations({ title: 'Arrival terminal' }),
    gateFrom: Schema.optional(Schema.String).annotations({ title: 'Departure gate' }),
    gateTo: Schema.optional(Schema.String).annotations({ title: 'Arrival gate' }),
  }),
);
export interface FlightDetails extends Schema.Schema.Type<typeof FlightDetails> {}

export const TrainDetails = Schema.extend(
  TransportFields,
  Schema.TaggedStruct('train', {
    platform: Schema.optional(Schema.String).annotations({ title: 'Platform' }),
    coach: Schema.optional(Schema.String).annotations({ title: 'Coach' }),
  }),
);
export interface TrainDetails extends Schema.Schema.Type<typeof TrainDetails> {}

export const BoatDetails = Schema.extend(
  TransportFields,
  Schema.TaggedStruct('boat', {
    vessel: Schema.optional(Schema.String).annotations({ title: 'Vessel' }),
  }),
);
export interface BoatDetails extends Schema.Schema.Type<typeof BoatDetails> {}

// TODO(burdon): Separate structure for route?
export const RoadDetails = Schema.extend(
  TransportFields,
  Schema.TaggedStruct('road', {
    subKind: Schema.optional(RoadSubKind).annotations({ title: 'Mode' }),
  }),
);
export interface RoadDetails extends Schema.Schema.Type<typeof RoadDetails> {}

export const AccommodationDetails = Schema.TaggedStruct('accommodation', {
  propertyName: Schema.optional(Schema.String).annotations({ title: 'Property' }),
  roomType: Schema.optional(Schema.String).annotations({ title: 'Room type' }),
  /** Location of the property — single `Place`, no origin/destination distinction. */
  location: Schema.optional(Place).annotations({ title: 'Location' }),
  checkIn: Schema.optional(Format.DateTime).annotations({ title: 'Check-in' }),
  checkOut: Schema.optional(Format.DateTime).annotations({ title: 'Check-out' }),
});

export interface AccommodationDetails extends Schema.Schema.Type<typeof AccommodationDetails> {}

export const ActivityDetails = Schema.TaggedStruct('activity', {
  title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
  venue: Schema.optional(Place).annotations({ title: 'Venue' }),
  /** Activity start. */
  departAt: Schema.optional(Format.DateTime).annotations({ title: 'Start' }),
  /** Activity end. */
  arriveAt: Schema.optional(Format.DateTime).annotations({ title: 'End' }),
});

export interface ActivityDetails extends Schema.Schema.Type<typeof ActivityDetails> {}

export const Details = Schema.Union(
  FlightDetails,
  TrainDetails,
  BoatDetails,
  RoadDetails,
  AccommodationDetails,
  ActivityDetails,
);

export type Details = Schema.Schema.Type<typeof Details>;

//
// Segment ECHO type
//

/**
 * A travel segment. ECHO struct with a discriminated `details` field whose `_tag` selects the variant.
 * Segments are referenced from a Trip via `Ref<Segment>[]` and declared as children via `Obj.setParent(segment, trip)`.
 * NOTE: Multiple segments may reference the same Booking.
 */
export const Segment = Schema.Struct({
  booking: Schema.optional(Ref.Ref(Booking.Booking)),
  notes: Schema.optional(Schema.String),
  details: Details,
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--ticket--regular',
    hue: 'sky',
  }),
  Type.makeObject(DXN.make('org.dxos.type.trip.segment', '0.1.0')),
);

export interface Segment extends Type.InstanceType<typeof Segment> {}

/** Type guard for Segment ECHO objects. */
export const instanceOf = (value: unknown): value is Segment => Obj.instanceOf(Segment, value);

/** Creates a new Segment from full props. Callers usually want `makeDefault(kind)`. */
export const make = (props: Obj.MakeProps<typeof Segment>): Segment => Obj.make(Segment, props);

/** Convenience: create a default segment for a given kind. */
export const makeDefault = (kind: Kind): Segment => {
  switch (kind) {
    case 'flight':
      return make({ details: { _tag: 'flight' } });
    case 'train':
      return make({ details: { _tag: 'train' } });
    case 'boat':
      return make({ details: { _tag: 'boat' } });
    case 'road':
      return make({ details: { _tag: 'road', subKind: 'car' } });
    case 'accommodation':
      return make({ details: { _tag: 'accommodation' } });
    case 'activity':
      return make({ details: { _tag: 'activity', title: 'Activity' } });
  }
};

//
// Variant helpers
//

/** Returns the discriminator kind. */
export const getKind = (seg: Segment): Kind => seg.details._tag;

/**
 * Departure time across variants.
 * - transport / activity: `departAt`
 * - accommodation:        `checkIn`
 */
export const getDepartAt = (seg: Segment): string | undefined =>
  seg.details._tag === 'accommodation' ? seg.details.checkIn : seg.details.departAt;

/**
 * Arrival / end time across variants.
 * - transport / activity: `arriveAt`
 * - accommodation:        `checkOut`
 */
export const getArriveAt = (seg: Segment): string | undefined =>
  seg.details._tag === 'accommodation' ? seg.details.checkOut : seg.details.arriveAt;

/**
 * "From" Place across variants.
 * - transport:     `origin`
 * - accommodation: `location`
 * - activity:      `venue`
 */
export const getOrigin = (seg: Segment): Place | undefined => {
  switch (seg.details._tag) {
    case 'accommodation':
      return seg.details.location;
    case 'activity':
      return seg.details.venue;
    default:
      return seg.details.origin;
  }
};

/**
 * "To" Place across variants.
 * - transport:     `destination`
 * - accommodation / activity: same as origin (single-location variants)
 */
export const getDestination = (seg: Segment): Place | undefined => {
  switch (seg.details._tag) {
    case 'accommodation':
    case 'activity':
      return getOrigin(seg);
    default:
      return seg.details.destination;
  }
};

//
// Display helpers
//

/** Parses an ISO string to a Date; returns undefined if missing or invalid. */
export const parseDate = (iso?: string): Date | undefined => {
  if (!iso) {
    return undefined;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/** Primary date for calendar highlighting and sort order. */
export const getPrimaryDate = (seg: Segment): Date | undefined => parseDate(getDepartAt(seg));

/** Short human-readable title. */
export const getTitle = (seg: Segment): string => {
  switch (seg.details._tag) {
    case 'flight':
      return [seg.details.provider?.name, seg.details.number].filter(Boolean).join(' ') || 'Flight';
    case 'train':
      return [seg.details.provider?.name, seg.details.number].filter(Boolean).join(' ') || 'Train';
    case 'boat':
      return [seg.details.provider?.name, seg.details.vessel ?? seg.details.number].filter(Boolean).join(' ') || 'Boat';
    case 'road':
      return seg.details.provider?.name ?? seg.details.subKind ?? 'Road';
    case 'accommodation':
      return seg.details.propertyName ?? seg.details.location?.name ?? 'Accommodation';
    case 'activity':
      return seg.details.title ?? 'Activity';
  }
};

/** Route string e.g. "JFK → LHR". Single-location variants render just the place. */
export const getRoute = (seg: Segment): string | undefined => {
  const origin = getOrigin(seg);
  if (seg.details._tag === 'accommodation' || seg.details._tag === 'activity') {
    return origin?.name ?? origin?.city ?? origin?.code;
  }
  const destination = getDestination(seg);
  const from = origin?.code ?? origin?.city ?? origin?.name;
  const to = destination?.code ?? destination?.city ?? destination?.name;
  if (!from && !to) {
    return undefined;
  }
  return [from, to].filter(Boolean).join(' → ');
};

/** Phosphor icon name for a segment kind. */
export const kindIcon = (kind: Kind): string => {
  switch (kind) {
    case 'flight':
      return 'ph--airplane--regular';
    case 'train':
      return 'ph--train--regular';
    case 'boat':
      return 'ph--boat--regular';
    case 'road':
      return 'ph--car--regular';
    case 'accommodation':
      return 'ph--bed--regular';
    case 'activity':
      return 'ph--ticket--regular';
  }
};
