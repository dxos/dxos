//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';

/**
 * Generic location shape. Embedded inline — not an ECHO Type.makeObject.
 * Uniform across modes so Table and Map views work without per-variant branching.
 */
export const Place = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  code: Schema.optional(
    Schema.String.annotations({
      title: 'Code',
      description: 'IATA / IBNR / port / property code',
      examples: ['JFK', 'CDG', 'LAX', 'BKK'],
    }),
  ),
  city: Schema.optional(Schema.String.annotations({ title: 'City' })),
  country: Schema.optional(Schema.String.annotations({ title: 'Country' })),
  geo: Format.GeoPoint.pipe(Schema.optional),
}).pipe(Annotation.LabelAnnotation.set(['name']));

export interface Place extends Schema.Schema.Type<typeof Place> {}
