//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export const ResourceKey = Schema.Union(Schema.String, Schema.Record({ key: Schema.String, value: Schema.Any }));
export type ResourceKey = Schema.Schema.Type<typeof ResourceKey>;

export const ResourceLanguage = Schema.Record({ key: Schema.String, value: ResourceKey });
export type ResourceLanguage = Schema.Schema.Type<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = Schema.Record({ key: Schema.String, value: ResourceLanguage });
export type Resource = Schema.Schema.Type<typeof Resource>;
