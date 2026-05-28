//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

/**
 * Provenance relation. Source = the extracted object (Booking, Segment, …).
 * Target = the source Message. One relation per created object so callers
 * can walk Booking → Message and Segment → Message independently.
 */
export const ExtractedFrom = Schema.Struct({
  id: Obj.ID,
  extractorId: Schema.String,
  extractedAt: Schema.String,
  confidence: Schema.optional(Schema.Number),
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.extractedFrom', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export interface ExtractedFrom extends Type.InstanceType<typeof ExtractedFrom> {}

/** Creates an `ExtractedFrom` provenance relation linking an extracted object to its source `Message`. */
export const make = (props: Relation.MakeProps<typeof ExtractedFrom>) => Relation.make(ExtractedFrom, props);
