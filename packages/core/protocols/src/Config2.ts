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
  /** Reverse-domain NSID — the plugin's globally-unique key (e.g. `org.dxos.plugin.excalidraw`). */
  key: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  /**
   * Author or organization name. Only used for bundled plugins. For plugins published to the
   * registry this field is ignored — the verified publisher (handle ?? did) is used instead.
   */
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(Screenshot)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(Icon),
  spec: Schema.optional(Schema.String),
  /** Composer plugin ids this plugin depends on at runtime (NSIDs). */
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

/** Identity helper: authors a typed `dx.config.ts`. Validation runs at load time, not here. */
export const make = (config: Config): Config => config;
