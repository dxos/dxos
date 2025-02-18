//
// Copyright 2023 DXOS.org
//

import { Schema as S } from '@effect/schema';

export const ResourceKey = S.Union(S.String, S.Record({ key: S.String, value: S.Any }));
export type ResourceKey = S.Schema.Type<typeof ResourceKey>;

export const ResourceLanguage = S.Record({ key: S.String, value: ResourceKey });
export type ResourceLanguage = S.Schema.Type<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = S.Record({ key: S.String, value: ResourceLanguage });
export type Resource = S.Schema.Type<typeof Resource>;
