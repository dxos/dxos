//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * A Label represents translatable text - either a simple string or a tuple of [key, options].
 */
export const Label = Schema.Union([
  Schema.String,
  Schema.mutable(
    Schema.Tuple([
      Schema.String,
      Schema.Struct({
        ns: Schema.Union([Schema.String, Schema.Array(Schema.String)]),
        count: Schema.optional(Schema.Number),
        defaultValue: Schema.optional(Schema.String),
      }).mapFields(Struct.map(Schema.mutableKey)),
    ]),
  ),
]);
export type Label = Schema.Schema.Type<typeof Label>;
