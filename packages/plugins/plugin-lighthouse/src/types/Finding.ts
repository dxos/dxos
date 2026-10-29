//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/** Where a set of a Finding's facts came from. */
export const FindingSource = Schema.Struct({
  /** The extractor that wrote them, `id@version`. */
  extractor: Schema.String,
  /** The page or API it read. */
  source: Schema.optional(Schema.String),
  at: Schema.String,
});

export interface FindingSource extends Schema.Schema.Type<typeof FindingSource> {}

/** Who kept a Finding: the agent's report (a pick) or the person (a star). */
export const KeptBy = Schema.Literals(['pick', 'person']);

export type KeptBy = Schema.Schema.Type<typeof KeptBy>;

/**
 * One result copied out of lighthouse into the space: the entity's identity and facts at the time it was kept, with
 * where they came from. Immutable (a feed entry); keeping it again after the facts change appends a newer entry.
 */
export class Finding extends Type.makeObject<Finding>(DXN.make('org.dxos.type.lighthouse.Finding', '0.1.0'))(
  Schema.Struct({
    /** The lighthouse subject. */
    iri: Schema.String,
    title: Schema.String.pipe(Schema.annotate({ title: 'Title' })),
    url: Schema.optional(Schema.String),
    /** CURIEs, e.g. `schema:Restaurant`. */
    types: Schema.Array(Schema.String),
    images: Schema.Array(Schema.String),
    /** CURIE -> values, as lighthouse returns them. */
    properties: Schema.Record(
      Schema.String,
      Schema.Array(Schema.Union([Schema.String, Schema.Number, Schema.Boolean])),
    ),
    provenance: Schema.Array(FindingSource),
    /** The rating score when it was kept. */
    score: Schema.optional(Schema.Number),
    /** The agent's reason, for a pick. */
    why: Schema.optional(Schema.String),
    keptBy: KeptBy,
    keptAt: Schema.String,
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--push-pin--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

export const instanceOf = (value: unknown): value is Finding => Obj.instanceOf(Finding, value);

export const make = (props: Obj.MakeProps<typeof Finding>): Finding => Obj.make(Finding, props);
