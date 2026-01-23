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

export const ResourceKey = Schema.Union(Schema.String, Schema.Record({ key: Schema.String, value: Schema.Any }));
export type ResourceKey = Schema.Schema.Type<typeof ResourceKey>;

export const ResourceLanguage = Schema.Record({ key: Schema.String, value: ResourceKey });
export type ResourceLanguage = Schema.Schema.Type<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = Schema.Record({ key: Schema.String, value: ResourceLanguage });
export type Resource = Schema.Schema.Type<typeof Resource>;
