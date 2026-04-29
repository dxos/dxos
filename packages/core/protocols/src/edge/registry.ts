//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Hydrated plugin metadata, mirroring the @dxos/app-framework `Plugin.Meta` shape.
 *
 * Defined locally rather than imported from @dxos/app-framework to keep the protocols
 * package free of UI/runtime dependencies. Consumers can treat decoded values as
 * `Plugin.Meta` directly.
 */
export const PluginMetaSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(Schema.String)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(Schema.String),
  iconHue: Schema.optional(Schema.String),
});
export type PluginMeta = Schema.Schema.Type<typeof PluginMetaSchema>;

/**
 * Health signal the registry service attaches to a hydrated entry when a refresh fails.
 * Clients surface the appropriate badge or filter entries based on this field.
 */
export const PluginHealthSchema = Schema.Literal('ok', 'release-missing', 'manifest-invalid', 'repo-unavailable');
export type PluginHealth = Schema.Schema.Type<typeof PluginHealthSchema>;

/**
 * Shape of the manifest-asset JSON the registry service fetches from each plugin's latest release.
 *
 * Two flavours are accepted, distinguished by which fields are populated:
 *
 *  - **Multi-asset (current)** — emitted by `@dxos/app-framework/vite-plugin`'s
 *    `composerPlugin` (see `MANIFEST_ASSET_NAME`). Has `version` + `entry` + `assets[]`
 *    listing every file the plugin needs at runtime. Lets the host precache the whole
 *    bundle for offline use. Paths in `entry`/`assets` are relative to the manifest URL.
 *
 *  - **Legacy single-file** — predates multi-asset. Has only the entry filename in
 *    `moduleFile` (defaults to `plugin.mjs`); CSS and other sibling assets are inlined.
 *    Kept here so the registry service can continue hydrating already-published plugins
 *    while the catalog migrates.
 *
 *  Consumers should look at `assets` to decide which flavour they're parsing — its
 *  presence implies the multi-asset shape.
 */
export const PluginManifestSchema = Schema.Struct({
  ...PluginMetaSchema.fields,
  /** Plugin version (semver). Multi-asset only; sourced from the publisher's `package.json`. */
  version: Schema.optional(Schema.String),
  /** Relative path to the entry module dynamic-imported by the host. Multi-asset only. */
  entry: Schema.optional(Schema.String),
  /** Relative paths of every file the plugin needs at runtime, including the entry. Multi-asset only. */
  assets: Schema.optional(Schema.Array(Schema.String)),
  /** Legacy override for the single-file bundle filename (default `plugin.mjs`). */
  moduleFile: Schema.optional(Schema.String),
});
export type PluginManifest = Schema.Schema.Type<typeof PluginManifestSchema>;

/**
 * Single hydrated plugin entry returned by the registry service.
 */
export const PluginEntrySchema = Schema.Struct({
  /** GitHub repository in `owner/name` form. Empty string for entries sourced from a `manifestUrl`. */
  repo: Schema.String,
  /** Plugin metadata from the repo's latest-release `manifest.json`. */
  meta: PluginMetaSchema,
  /**
   * URL of the plugin's `manifest.json`. Composer's URL loader fetches this, eagerly caches
   * every declared asset via the platform `PluginAssetCache`, then dynamic-imports the entry.
   * The URL must be CORS-safe and have its declared assets reachable as siblings.
   */
  moduleUrl: Schema.String,
  /** Release tag the entry was resolved from (e.g. `v0.1.0`). Empty string for `manifestUrl` entries. */
  releaseTag: Schema.String,
  /** Health signal set by the service when an entry fails to refresh. */
  health: PluginHealthSchema,
  /** Unix ms when this entry was last successfully hydrated. */
  hydratedAt: Schema.Number,
});
export type PluginEntry = Schema.Schema.Type<typeof PluginEntrySchema>;

/**
 * Response body of `GET /registry/plugins`.
 */
export const GetPluginsResponseBodySchema = Schema.Struct({
  /** Wire-format schema version, pinned to 1. */
  version: Schema.Literal(1),
  /** Hydrated entries. Order matches the order in the upstream catalog manifest. */
  plugins: Schema.Array(PluginEntrySchema),
  /** Unix ms timestamp of the most recent successful refresh cycle. */
  refreshedAt: Schema.Number,
});
export type GetPluginsResponseBody = Schema.Schema.Type<typeof GetPluginsResponseBodySchema>;

/**
 * A catalog entry. Two flavours:
 *  - `{ repo }`: the registry service hydrates from the GitHub repo's latest release.
 *    Used by the production catalog.
 *  - `{ manifestUrl }`: the registry service skips GitHub and fetches the manifest directly.
 *    Used for local development against an in-progress plugin (e.g. served by `vite preview`)
 *    so authors can iterate without publishing a release.
 */
export const RegistryEntrySchema = Schema.Union(
  Schema.Struct({ repo: Schema.String.pipe(Schema.nonEmptyString()) }),
  Schema.Struct({ manifestUrl: Schema.String.pipe(Schema.nonEmptyString()) }),
);
export type RegistryEntry = Schema.Schema.Type<typeof RegistryEntrySchema>;

/**
 * Shape of the catalog manifest published in the upstream community-plugins repo.
 * Extra keys (e.g. `$schema`) are permitted.
 */
export const RegistryManifestSchema = Schema.Struct(
  {
    version: Schema.Literal(1),
    plugins: Schema.Array(RegistryEntrySchema),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
export type RegistryManifest = Schema.Schema.Type<typeof RegistryManifestSchema>;
