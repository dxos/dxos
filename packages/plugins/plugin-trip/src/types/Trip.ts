//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { TRIP_SKILL_KEY } from '../skills/keys';
import * as Segment from './Segment';

/**
 * Itinerary container — ordered list of segment Refs. Each Segment is a
 * standalone ECHO object whose parent is the Trip (set via Obj.setParent).
 * Tags use Obj.getMeta(trip).tags (no tags field in schema).
 */
export class Trip extends Type.makeObject<Trip>(DXN.make('org.dxos.type.trip', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    summary: Schema.optional(Schema.String),
    start: Schema.optional(Format.DateTime),
    end: Schema.optional(Format.DateTime),
    segments: Schema.Array(Ref.Ref(Segment.Segment)).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--airplane-takeoff--regular', hue: 'sky' }),
    AppAnnotation.SkillsAnnotation.set([TRIP_SKILL_KEY]),
  ),
) {}

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
    trip.segments.push(Ref.make(segment));
  });
};

/** Removes a segment ref from a trip by its ECHO id. */
export const removeSegment = (trip: Trip, segmentId: string): void => {
  Obj.update(trip, (trip) => {
    const index = trip.segments.findIndex((ref) => Ref.isRef(ref) && ref.target?.id === segmentId);
    if (index >= 0) {
      trip.segments.splice(index, 1);
    }
  });
};

/**
 * Resolves a trip's segment refs to the currently-loaded Segment objects,
 * sorted ascending by primary (departure) date; undated segments sort last
 * (stable by original order). This is the canonical segment order — used for
 * both display (SegmentStack) and keyboard navigation, so they stay in sync.
 * Refs whose target is not yet loaded are skipped.
 */
export const getSegments = (trip: Trip): Segment.Segment[] => {
  const list = (trip.segments ?? [])
    .map((ref) => (Ref.isRef(ref) ? ref.target : undefined))
    .filter((segment): segment is Segment.Segment => Segment.instanceOf(segment));
  return list.sort(
    (a, b) =>
      (Segment.getPrimaryDate(a)?.getTime() ?? Number.POSITIVE_INFINITY) -
      (Segment.getPrimaryDate(b)?.getTime() ?? Number.POSITIVE_INFINITY),
  );
};
