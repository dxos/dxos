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
 * Extends {@link PluginMetaSchema} with an optional override for the module bundle filename
 * (defaults to `plugin.mjs`).
 */
export const PluginManifestSchema = Schema.Struct({
  ...PluginMetaSchema.fields,
  moduleFile: Schema.optional(Schema.String),
});
export type PluginManifest = Schema.Schema.Type<typeof PluginManifestSchema>;

/**
 * Single hydrated plugin entry returned by the registry service.
 */
export const PluginEntrySchema = Schema.Struct({
  /** GitHub repository in `owner/name` form. */
  repo: Schema.String.pipe(Schema.nonEmptyString()),
  /** Plugin metadata from the repo's latest-release `manifest.json`. */
  meta: PluginMetaSchema,
  /**
   * URL from which Composer can dynamic-import the plugin module. The registry service is
   * responsible for returning a URL that is CORS-safe for browser `import()` (e.g. served or
   * proxied by the service itself); clients pass this value directly to the URL loader.
   */
  moduleUrl: Schema.String,
  /** Release tag the entry was resolved from (e.g. `v0.1.0`). */
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
 * Shape of the catalog manifest published in the upstream community-plugins repo.
 * Extra keys (e.g. `$schema`) are permitted.
 */
export const RegistryManifestSchema = Schema.Struct(
  {
    version: Schema.Literal(1),
    plugins: Schema.Array(
      Schema.Struct({
        repo: Schema.String,
      }),
    ),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
export type RegistryManifest = Schema.Schema.Type<typeof RegistryManifestSchema>;
