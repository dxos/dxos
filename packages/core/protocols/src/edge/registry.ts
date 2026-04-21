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
export const CommunityPluginMetaSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(Schema.String)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(Schema.String),
  iconHue: Schema.optional(Schema.String),
});
export type CommunityPluginMeta = Schema.Schema.Type<typeof CommunityPluginMetaSchema>;

/**
 * Health signal the Edge service attaches to a hydrated entry when a refresh fails.
 * Clients surface the appropriate badge or filter entries based on this field.
 */
export const CommunityPluginHealthSchema = Schema.Literal(
  'ok',
  'release-missing',
  'manifest-invalid',
  'repo-unavailable',
);
export type CommunityPluginHealth = Schema.Schema.Type<typeof CommunityPluginHealthSchema>;

/**
 * Shape of the manifest-asset JSON Edge fetches from each plugin's latest release.
 * Extends {@link CommunityPluginMetaSchema} with an optional override for the module
 * bundle filename (defaults to `plugin.mjs`).
 */
export const CommunityPluginManifestSchema = Schema.Struct({
  ...CommunityPluginMetaSchema.fields,
  moduleFile: Schema.optional(Schema.String),
});
export type CommunityPluginManifest = Schema.Schema.Type<typeof CommunityPluginManifestSchema>;

/**
 * Single hydrated community plugin entry returned by the registry service.
 */
export const CommunityPluginEntrySchema = Schema.Struct({
  /** GitHub repository in `owner/name` form. */
  repo: Schema.String.pipe(Schema.nonEmptyString()),
  /** Plugin metadata from the repo's latest-release `manifest.json`. */
  meta: CommunityPluginMetaSchema,
  /**
   * CORS-safe URL from which Composer can dynamic-import the plugin module.
   * For GitHub releases this is the REST asset URL `/repos/.../releases/assets/{id}`;
   * `url-loader.isGitHubReleaseAssetApiUrl` recognizes this form and fetches via
   * `Accept: application/octet-stream` + blob URL dynamic import.
   */
  moduleUrl: Schema.String,
  /** Release tag the entry was resolved from (e.g. `v0.1.0`). */
  releaseTag: Schema.String,
  /** Health signal set by the service when an entry fails to refresh. */
  health: CommunityPluginHealthSchema,
  /** Unix ms when this entry was last successfully hydrated. */
  hydratedAt: Schema.Number,
});
export type CommunityPluginEntry = Schema.Schema.Type<typeof CommunityPluginEntrySchema>;

/**
 * Response body of `GET /registry/plugins`.
 */
export const GetCommunityPluginsResponseBodySchema = Schema.Struct({
  /** Wire-format schema version, pinned to 1. */
  version: Schema.Literal(1),
  /** Hydrated entries. Order matches the order in `community-plugins.json`. */
  plugins: Schema.Array(CommunityPluginEntrySchema),
  /** Unix ms timestamp of the most recent successful refresh cycle. */
  refreshedAt: Schema.Number,
});
export type GetCommunityPluginsResponseBody = Schema.Schema.Type<typeof GetCommunityPluginsResponseBodySchema>;

/**
 * Shape of the `community-plugins.json` manifest published in the
 * `dxos/community-plugins` repo. Extra keys (e.g. `$schema`) are permitted.
 */
export const CommunityRegistryManifestSchema = Schema.Struct(
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
export type CommunityRegistryManifest = Schema.Schema.Type<typeof CommunityRegistryManifestSchema>;
