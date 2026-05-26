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
// Kind enum
//

export const Kind = Schema.Literal('flight', 'train', 'boat', 'road', 'accommodation', 'activity');
export type Kind = Schema.Schema.Type<typeof Kind>;

/**
 * tentative: user-authored placeholder.
 * proposed:  extractor/agent suggestion awaiting user accept.
 * confirmed: backed by a real Booking.
 * cancelled: kept for history; rendered de-emphasised.
 */
export const Status = Schema.Literal('tentative', 'proposed', 'confirmed', 'cancelled');
export type Status = Schema.Schema.Type<typeof Status>;

export const RoadSubKind = Schema.Literal('bus', 'car', 'transfer', 'taxi', 'walk');
export type RoadSubKind = Schema.Schema.Type<typeof RoadSubKind>;

export const Cabin = Schema.Literal('economy', 'premium', 'business', 'first');
export type Cabin = Schema.Schema.Type<typeof Cabin>;

//
// Segment ECHO type
//

/**
 * A travel segment. Single ECHO object type with union properties — `kind`
 * discriminates the variant and the variant-specific fields are optional.
 * Segments are referenced from a Trip via `Ref<Segment>[]` and declared as
 * children via `Obj.setParent(segment, trip)`.
 */
export const Segment = Schema.Struct({
  // Core (all variants).
  status: Status,
  kind: Kind,

  origin: Schema.optional(Place),
  destination: Schema.optional(Place),
  departAt: Schema.optional(Format.DateTime),
  arriveAt: Schema.optional(Format.DateTime),
  booking: Schema.optional(Ref.Ref(Booking.Booking)),
  notes: Schema.optional(Schema.String),

  // TOOD(burdon): Harmonize flight/train/vesselNumber, airline/operator, common fields, etc.
  // TODO(burdon): Annotations for IATA codes, etc. (See Amadeus for examples.)

  // Flight.
  airline: Schema.optional(Provider.Provider),
  flightNumber: Schema.optional(Schema.String),
  cabin: Schema.optional(Cabin),
  terminalFrom: Schema.optional(Schema.String),
  terminalTo: Schema.optional(Schema.String),
  gateFrom: Schema.optional(Schema.String),
  gateTo: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),

  // Train (shares operator + seat with road/accommodation/etc).
  operator: Schema.optional(Provider.Provider),
  trainNumber: Schema.optional(Schema.String),
  coach: Schema.optional(Schema.String),

  // Boat (operator + cabin shared).
  vessel: Schema.optional(Schema.String),

  // Road.
  subKind: Schema.optional(RoadSubKind),
  vehicleClass: Schema.optional(Schema.String),

  // Accommodation.
  propertyName: Schema.optional(Schema.String),
  roomType: Schema.optional(Schema.String),
  checkIn: Schema.optional(Format.DateTime),
  checkOut: Schema.optional(Format.DateTime),

  // Activity.
  title: Schema.optional(Schema.String),
  venue: Schema.optional(Place),
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

/** Creates a blank Segment of the given kind. */
export const make = (props: Obj.MakeProps<typeof Segment>): Segment => Obj.make(Segment, props);

/** Convenience: create a default segment for a given kind. */
export const makeDefault = (kind: Kind): Segment => {
  const base: Obj.MakeProps<typeof Segment> = { kind, status: 'tentative' };
  switch (kind) {
    case 'road':
      return make({ ...base, subKind: 'car' });
    case 'activity':
      return make({ ...base, title: 'Activity' });
    default:
      return make(base);
  }
};

//
// Helpers
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
export const getPrimaryDate = (seg: Segment): Date | undefined => {
  return parseDate(seg.kind === 'accommodation' ? (seg.checkIn ?? seg.departAt) : seg.departAt);
};

/** Short human-readable title. */
export const getTitle = (seg: Segment): string => {
  switch (seg.kind) {
    case 'flight':
      return [seg.airline?.name, seg.flightNumber].filter(Boolean).join(' ') || 'Flight';
    case 'train':
      return [seg.operator?.name, seg.trainNumber].filter(Boolean).join(' ') || 'Train';
    case 'boat':
      return [seg.operator?.name, seg.vessel].filter(Boolean).join(' ') || 'Boat';
    case 'road':
      return seg.operator?.name ?? seg.subKind ?? 'Road';
    case 'accommodation':
      return seg.propertyName ?? seg.origin?.name ?? 'Accommodation';
    case 'activity':
      return seg.title ?? 'Activity';
  }
};

/** Route string e.g. "JFK → LHR". */
export const getRoute = (seg: Segment): string | undefined => {
  if (seg.kind === 'activity') {
    return seg.venue?.name;
  }
  const from = seg.origin?.code ?? seg.origin?.city ?? seg.origin?.name;
  const to = seg.destination?.code ?? seg.destination?.city ?? seg.destination?.name;
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
