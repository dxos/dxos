//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as Segment from './Segment';

/**
 * Itinerary container — ordered list of segment Refs. Each Segment is a
 * standalone ECHO object whose parent is the Trip (set via Obj.setParent).
 * Tags use Obj.getMeta(trip).tags (no tags field in schema).
 */
export const Trip = Schema.Struct({
  name: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  segments: Schema.Array(Ref.Ref(Segment.Segment)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.trip',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--airplane-takeoff--regular',
    hue: 'sky',
  }),
);

export interface Trip extends Schema.Schema.Type<typeof Trip> {}

export const instanceOf = (value: unknown): value is Trip => Obj.instanceOf(Trip, value);

export const make = (props: Partial<Obj.MakeProps<typeof Trip>> = {}): Trip =>
  Obj.make(Trip, { segments: [], ...props });

/**
 * Adds a segment to a trip, setting the trip as the segment's parent so the
 * segment is owned by (and lives under) the trip in the object hierarchy.
 */
export const addSegment = (trip: Trip, segment: Segment.Segment): void => {
  Obj.setParent(segment, trip);
  Obj.update(trip, (trip) => {
    trip.segments = [...(trip.segments ?? []), Ref.make(segment)] as typeof trip.segments;
  });
};
