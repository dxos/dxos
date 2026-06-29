//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

import { meta } from '../meta';

const EdgarConceptSourceSchema = Schema.Struct({
  concepts: Schema.Array(Schema.String),
  units: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
});

/** Maps a snapshot field to one or more SEC us-gaap XBRL concepts, or a ratio of concept groups. */
export const EdgarFieldSourceSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('concept'),
    concepts: Schema.Array(Schema.String),
    units: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  }),
  Schema.Struct({
    type: Schema.Literal('ratio'),
    numerator: EdgarConceptSourceSchema,
    denominator: EdgarConceptSourceSchema,
  }),
);
export type EdgarFieldSource = Schema.Schema.Type<typeof EdgarFieldSourceSchema>;

/** Place on schema fields to drive SEC EDGAR company-facts extraction. */
export const EdgarFieldAnnotation = Annotation.make({
  id: `${meta.profile.key}.annotation.edgarField`,
  schema: EdgarFieldSourceSchema,
});

/** Marks a record field that receives all us-gaap concepts not mapped elsewhere on the schema. */
export const EdgarAdditionalFactsAnnotation = Annotation.make({
  id: `${meta.profile.key}.annotation.edgarAdditionalFacts`,
  schema: Schema.Boolean,
});

/** Ordered concept groups used to derive {@link Ibkr.FundamentalsSnapshot.asOf} filing date. */
export const EdgarAsOfConceptsAnnotation = Annotation.make({
  id: `${meta.profile.key}.annotation.edgarAsOf`,
  schema: Schema.Array(Schema.Array(Schema.String)),
});
