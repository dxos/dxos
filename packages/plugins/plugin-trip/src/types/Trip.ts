//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as Segment from './Segment';

/**
 * Itinerary container — ordered list of inline Segments.
 * Tags use Obj.getMeta(trip).tags (no tags field in schema).
 */
export const Trip = Schema.Struct({
  name: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  segments: Schema.Array(Segment.Any),
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
