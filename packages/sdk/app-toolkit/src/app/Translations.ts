//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Translations from '@dxos/app-framework/Translations';

export const Label = Translations.Label;
export type Label = Translations.Label;

export const ResourceKey = Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.Any)]);
export type ResourceKey = Schema.Schema.Type<typeof ResourceKey>;

export const ResourceLanguage = Schema.Record(Schema.String, ResourceKey);
export type ResourceLanguage = Schema.Schema.Type<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = Schema.Record(Schema.String, ResourceLanguage);
export type Resource = Schema.Schema.Type<typeof Resource>;
