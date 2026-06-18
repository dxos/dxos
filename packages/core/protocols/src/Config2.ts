//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** A plugin preview image with optional theme-specific URLs (`light` / `dark`). */
export const Screenshot = Schema.Struct({
  light: Schema.optional(Schema.String),
  dark: Schema.optional(Schema.String),
});
export type Screenshot = Schema.Schema.Type<typeof Screenshot>;

/** Icon reference: Phosphor icon key with an optional theme hue. */
export const Icon = Schema.Struct({
  key: Schema.String.pipe(Schema.nonEmptyString()),
  hue: Schema.optional(Schema.String),
});
export type Icon = Schema.Schema.Type<typeof Icon>;

export const Plugin = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(Screenshot)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(Icon),
  version: Schema.optional(Schema.String),
  spec: Schema.optional(Schema.String),
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
});
export type Plugin = Schema.Schema.Type<typeof Plugin>;

/**
 * Publish orchestration for `dx registry publish`: build command, output directory, and optional
 * hosting override. All three are consumed together — they are a single workflow, not separate concerns.
 */
export const Publish = Schema.Struct({
  buildCommand: Schema.optional(Schema.String),
  outputDirectory: Schema.optional(Schema.String),
  assetBaseUrl: Schema.optional(Schema.String),
});
export type Publish = Schema.Schema.Type<typeof Publish>;

/**
 * The `dx.config.ts` schema: the TypeScript-authored replacement for the
 * plugin section of `dx.yml`. v1 carries one plugin's self-declared `meta` plus optional publish
 * orchestration; it will grow to absorb the rest of the (currently proto-based) config over time and
 * eventually become the canonical config.
 */
export const Config = Schema.Struct({
  plugin: Plugin,
  publish: Schema.optional(Publish),
});
export type Config = Schema.Schema.Type<typeof Config>;
