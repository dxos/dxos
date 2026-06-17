//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ScreenshotSchema } from '../edge/registry.ts';

/**
 * Self-declared plugin metadata authored in `dx.config.ts` (the `plugin` section). Mirrors the
 * self-declared subset of the app-framework `Plugin.Meta`: `id` is the bare NSID (the `key` and
 * `version` are derived downstream by `getMetaFromConfig`), and provenance (`author`) is
 * intentionally absent — it is resolved at runtime from the publisher or an app-configured default,
 * not authored here.
 */
/** Icon reference: bare key string, or key + optional hue. */
export const IconSchema = Schema.Union(
  Schema.String,
  Schema.Struct({ key: Schema.String, hue: Schema.optional(Schema.String) }),
);
export type IconSchema = Schema.Schema.Type<typeof IconSchema>;

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
