//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IconSchema, ScreenshotSchema } from '../edge/registry.ts';

export { IconSchema, ScreenshotSchema };
export type { Icon as IconType, Screenshot } from '../edge/registry.ts';

export const PluginMeta = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  version: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  spec: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(ScreenshotSchema)),
  icon: Schema.optional(IconSchema),
  tags: Schema.optional(Schema.Array(Schema.String)),
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
