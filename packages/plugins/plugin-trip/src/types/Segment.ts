//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { Provider } from '@dxos/types';

import { Booking } from './Booking';
import { Place } from './Place';

// ---------------------------------------------------------------------------
// Core fields (spread into every variant via ...Core.fields)
// ---------------------------------------------------------------------------

export const Core = Schema.Struct({
  /** Stable per-trip id. Does not change when status is promoted. */
  id: Schema.String,
  /**
   * tentative: user-authored placeholder.
   * proposed:  extractor/agent suggestion awaiting user accept.
   * confirmed: backed by a real Booking.
   * cancelled: kept for history; rendered de-emphasised.
   */
  status: Schema.Literal('tentative', 'proposed', 'confirmed', 'cancelled'),
  origin: Place.pipe(Schema.optional),
  destination: Place.pipe(Schema.optional),
  departAt: Schema.optional(Schema.String),
  arriveAt: Schema.optional(Schema.String),
  booking: Ref.Ref(Booking).pipe(Schema.optional),
  notes: Schema.optional(Schema.String),
});

export interface Core extends Schema.Schema.Type<typeof Core> {}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Flight = Schema.TaggedStruct('flight', {
  ...Core.fields,
  airline: Provider.Provider.pipe(Schema.optional),
  flightNumber: Schema.optional(Schema.String),
  cabin: Schema.Literal('economy', 'premium', 'business', 'first').pipe(Schema.optional),
  terminalFrom: Schema.optional(Schema.String),
  terminalTo: Schema.optional(Schema.String),
  gateFrom: Schema.optional(Schema.String),
  gateTo: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
});
export interface Flight extends Schema.Schema.Type<typeof Flight> {}

export const Train = Schema.TaggedStruct('train', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  trainNumber: Schema.optional(Schema.String),
  class: Schema.optional(Schema.String),
  coach: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
});
export interface Train extends Schema.Schema.Type<typeof Train> {}

export const Boat = Schema.TaggedStruct('boat', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  vessel: Schema.optional(Schema.String),
  cabin: Schema.optional(Schema.String),
});
export interface Boat extends Schema.Schema.Type<typeof Boat> {}

export const Road = Schema.TaggedStruct('road', {
  ...Core.fields,
  subKind: Schema.Literal('bus', 'car', 'transfer', 'taxi', 'walk'),
  operator: Provider.Provider.pipe(Schema.optional),
  vehicleClass: Schema.optional(Schema.String),
});
export interface Road extends Schema.Schema.Type<typeof Road> {}

export const Lodging = Schema.TaggedStruct('lodging', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  propertyName: Schema.optional(Schema.String),
  roomType: Schema.optional(Schema.String),
  checkIn: Schema.optional(Schema.String),
  checkOut: Schema.optional(Schema.String),
});
export interface Lodging extends Schema.Schema.Type<typeof Lodging> {}

export const Activity = Schema.TaggedStruct('activity', {
  ...Core.fields,
  title: Schema.String,
  operator: Provider.Provider.pipe(Schema.optional),
  venue: Place.pipe(Schema.optional),
});
export interface Activity extends Schema.Schema.Type<typeof Activity> {}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export const Any = Schema.Union(Flight, Train, Boat, Road, Lodging, Activity);
export type Any = Schema.Schema.Type<typeof Any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Primary date for calendar highlighting and sort order. */
export const getPrimaryDate = (seg: Any): Date | undefined => {
  const iso = seg._tag === 'lodging' ? (seg.checkIn ?? seg.departAt) : seg.departAt;
  return iso ? new Date(iso) : undefined;
};

/** Short human-readable title. */
export const getTitle = (seg: Any): string => {
  switch (seg._tag) {
    case 'flight':
      return [seg.airline?.name, seg.flightNumber].filter(Boolean).join(' ') || 'Flight';
    case 'train':
      return [seg.operator?.name, seg.trainNumber].filter(Boolean).join(' ') || 'Train';
    case 'boat':
      return [seg.operator?.name, seg.vessel].filter(Boolean).join(' ') || 'Boat';
    case 'road':
      return seg.operator?.name ?? seg.subKind;
    case 'lodging':
      return seg.propertyName ?? seg.origin?.name ?? 'Lodging';
    case 'activity':
      return seg.title;
  }
};

/** Route string e.g. "JFK → LHR". */
export const getRoute = (seg: Any): string | undefined => {
  if (seg._tag === 'activity') {
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
export const kindIcon = (tag: Any['_tag']): string => {
  switch (tag) {
    case 'flight':
      return 'ph--airplane--regular';
    case 'train':
      return 'ph--train--regular';
    case 'boat':
      return 'ph--boat--regular';
    case 'road':
      return 'ph--car--regular';
    case 'lodging':
      return 'ph--bed--regular';
    case 'activity':
      return 'ph--ticket--regular';
  }
};

/** Creates a blank segment of the given kind. */
export const makeDefault = (tag: Any['_tag'], id: string): Any => {
  const core = { id, status: 'tentative' as const };
  switch (tag) {
    case 'flight':
      return { ...core, _tag: 'flight' };
    case 'train':
      return { ...core, _tag: 'train' };
    case 'boat':
      return { ...core, _tag: 'boat' };
    case 'road':
      return { ...core, _tag: 'road', subKind: 'car' };
    case 'lodging':
      return { ...core, _tag: 'lodging' };
    case 'activity':
      return { ...core, _tag: 'activity', title: 'Activity' };
  }
};
