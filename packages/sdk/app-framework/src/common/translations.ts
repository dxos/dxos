//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * A Label represents translatable text - either a simple string or a tuple of [key, options].
 */
export const Label = Schema.Union(
  Schema.String,
  Schema.mutable(
    Schema.Tuple(
      Schema.String,
      Schema.mutable(
        Schema.Struct({
          ns: Schema.String,
          count: Schema.optional(Schema.Number),
          defaultValue: Schema.optional(Schema.String),
        }),
      ),
    ),
  ),
);
export type Label = Schema.Schema.Type<typeof Label>;
