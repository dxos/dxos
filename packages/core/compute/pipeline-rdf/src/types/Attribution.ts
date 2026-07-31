//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** PROV-O-named provenance. `source`/`wasDerivedFrom` are DXN strings. */
export const Attribution = Schema.Struct({
  agent: Schema.optional(Schema.String),
  source: Schema.String,
  generatedAtTime: Schema.String,
  wasDerivedFrom: Schema.optional(Schema.Array(Schema.String)),
  span: Schema.optional(Schema.Struct({ start: Schema.Number, end: Schema.Number })),
});
export interface Attribution extends Schema.Schema.Type<typeof Attribution> {}
