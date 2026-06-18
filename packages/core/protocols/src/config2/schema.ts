//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** A plugin preview image with optional theme-specific URLs (`light` / `dark`). */
export const ScreenshotSchema = Schema.Struct({
  light: Schema.optional(Schema.String),
  dark: Schema.optional(Schema.String),
});
export type Screenshot = Schema.Schema.Type<typeof ScreenshotSchema>;

/** Icon reference: Phosphor icon key with an optional theme hue. */
export const IconSchema = Schema.Struct({
  key: Schema.String.pipe(Schema.nonEmptyString()),
  hue: Schema.optional(Schema.String),
});
export type Icon = Schema.Schema.Type<typeof IconSchema>;

/**
 * Display and discovery metadata common to all plugin schema shapes.
 * Spread into {@link PluginManifestSchema} (edge) and {@link PluginMeta} (config2).
 */
export const PluginMetaBaseSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(ScreenshotSchema)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(IconSchema),
});
export type PluginMetaBase = Schema.Schema.Type<typeof PluginMetaBaseSchema>;

export const PluginMeta = Schema.Struct({
  ...PluginMetaBaseSchema.fields,
  version: Schema.optional(Schema.String),
  spec: Schema.optional(Schema.String),
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
});
export type PluginMeta = Schema.Schema.Type<typeof PluginMeta>;

/**
 * Publish orchestration for `dx registry publish`: build command, output directory, and optional
 * hosting override. All three are consumed together — they are a single workflow, not separate concerns.
 */
export const PublishConfig = Schema.Struct({
  buildCommand: Schema.optional(Schema.String),
  outdir: Schema.optional(Schema.String),
  assetBaseUrl: Schema.optional(Schema.String),
});
export type PublishConfig = Schema.Schema.Type<typeof PublishConfig>;

/**
 * The `dx.config.ts` schema (placeholder name `Config2`): the TypeScript-authored replacement for the
 * plugin section of `dx.yml`. v1 carries one plugin's self-declared `meta` plus optional publish
 * orchestration; it will grow to absorb the rest of the (currently proto-based) config over time and
 * eventually become the canonical config.
 */
export const Config2 = Schema.Struct({
  plugin: PluginMeta,
  publish: Schema.optional(PublishConfig),
});
export type Config2 = Schema.Schema.Type<typeof Config2>;
