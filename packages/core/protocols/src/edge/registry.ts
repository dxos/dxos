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
 * A snapshot of a plugin's declared dependencies resolved to concrete installed versions at build
 * time (`{ "@dxos/app-framework": "0.8.3", "react": "19.2.0", … }`). The host derives SDK
 * compatibility from the subset it shares with the plugin (the externalized `@dxos/*` packages).
 */
export const DependencyMapSchema = Schema.Record({ key: Schema.String, value: Schema.String });
export type DependencyMap = Schema.Schema.Type<typeof DependencyMapSchema>;

/**
 * Filename of the entry module every plugin must publish at the root of its bundle.
 * The host dynamic-imports `<manifest URL base>/index.mjs` directly — no per-plugin
 * configuration. `composerPlugin` outputs the bundle under this name so plugin authors
 * never have to think about it.
 */
export const PLUGIN_ENTRY_FILENAME = 'index.mjs';

/**
 * Shape of the manifest-asset JSON the registry service fetches from each plugin's latest release.
 *
 * Emitted by `@dxos/app-framework/vite-plugin`'s `composerPlugin` (see
 * `MANIFEST_ASSET_NAME`). Lists every file the plugin needs at runtime — the entry
 * module ({@link PLUGIN_ENTRY_FILENAME}) plus any sibling CSS, code-split chunks,
 * fonts, etc. — so the host can eagerly precache the whole bundle for offline use.
 * Paths in `assets` are relative to the manifest's URL.
 */
export const PluginManifestSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  screenshots: Schema.optional(Schema.Array(ScreenshotSchema)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  icon: Schema.optional(IconSchema),
  /** Plugin version (semver). Sourced from the publishing project's `package.json`. */
  version: Schema.String.pipe(Schema.nonEmptyString()),
  /**
   * Relative paths of every file the plugin needs at runtime, including the entry.
   * Must include {@link PLUGIN_ENTRY_FILENAME}; consumers verify on parse.
   */
  assets: Schema.Array(Schema.String).pipe(Schema.minItems(1)),
  /** Declared dependencies resolved to installed versions at build time (SDK-compat source). */
  dependencies: Schema.optional(DependencyMapSchema),
});
export type PluginManifest = Schema.Schema.Type<typeof PluginManifestSchema>;

// ─── ATProto-native registry view ────────────────────────────────────────────

/**
 * A single installable release of a plugin, projected from a `package.release`
 * ATProto record.
 */
export const PluginReleaseSchema = Schema.Struct({
  /** Semver version string, e.g. `0.8.3`. */
  version: Schema.String.pipe(Schema.nonEmptyString()),
  /** URL the host dynamic-imports to install this specific version. */
  moduleUrl: Schema.String.pipe(Schema.nonEmptyString()),
  /**
   * Dependencies this release was built against, resolved to installed versions. The host derives
   * SDK compatibility from the `@dxos/*` subset to decide whether to offer this release.
   */
  dependencies: Schema.optional(DependencyMapSchema),
});
export type PluginRelease = Schema.Schema.Type<typeof PluginReleaseSchema>;

/**
 * Verbatim content of a `package.profile` ATProto record, minus the rkey which is
 * lifted to {@link PluginViewSchema.slug}. Display metadata only — no runtime identity.
 */
export const PluginProfileSchema = Schema.Struct({
  /** Plugin display name. */
  name: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  /** Publisher's homepage or plugin documentation URL. */
  homepage: Schema.optional(Schema.String),
  /** Source repository URL. */
  source: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  screenshots: Schema.optional(Schema.Array(ScreenshotSchema)),
  icon: Schema.optional(IconSchema),
});
export type PluginProfile = Schema.Schema.Type<typeof PluginProfileSchema>;

/**
 * A single hydrated plugin entry returned by `GET /registry/plugins`.
 *
 * This is an indexer-assembled *view* — analogous to emdash's `PackageView` — projected
 * from four ATProto record types: `package.profile`, `package.release`,
 * `publisher.profile`, and `publisher.verification`. It is NOT a direct serialization
 * of any single ATProto record.
 *
 * Design notes:
 * - `slug` is required to be a valid NSID (e.g. `org.dxos.plugin.excalidraw`), making it
 *   the single identifier for both PDS addressing and the composer runtime plugin id.
 *   `DXN.make(slug, latestVersion)` reconstructs the canonical `Plugin.Meta.key`.
 * - `releases` inlines all known versions, eliminating a separate versions round-trip for
 *   the version picker. Ordered newest-first.
 * - `latestVersion` is a convenience pointer into `releases` indicating the recommended
 *   install target.
 */
export const PluginViewSchema = Schema.Struct({
  // ── Addressing / provenance (indexer-derived) ────────────────────────────
  /**
   * `at://` URI of the source `package.profile` record.
   * Globally unique and stable — never changes after the record is published.
   */
  uri: Schema.String.pipe(Schema.nonEmptyString()),
  /** Publisher DID, e.g. `did:plc:abc…`. Cryptographic identity; never changes. */
  did: Schema.String.pipe(Schema.nonEmptyString()),
  /**
   * Publisher AT Protocol handle at index time, e.g. `alice.bsky.social`.
   * Display-only — handles can be reassigned; never use as a stable key.
   */
  handle: Schema.optional(Schema.String),
  /**
   * Package slug — the rkey of the `package.profile` record.
   * MUST be a valid NSID (e.g. `org.dxos.plugin.excalidraw`).
   * Serves as both the PDS record address and the composer plugin id.
   * `DXN.make(slug, latestVersion)` yields the canonical `Plugin.Meta.key`.
   */
  slug: Schema.String.pipe(Schema.nonEmptyString()),
  /** Unix ms when the indexer last assembled this entry. */
  indexedAt: Schema.Number,
  /**
   * Trust labels derived from curator `publisher.verification` records.
   * An empty array means the entry has no verification signal.
   */
  labels: Schema.Array(Schema.String),

  // ── Verbatim profile record content ─────────────────────────────────────
  profile: PluginProfileSchema,

  // ── Releases (projected from package.release records) ───────────────────
  /**
   * All known releases for this package, ordered newest-first.
   * Powers the version picker directly — no separate endpoint needed.
   */
  releases: Schema.Array(PluginReleaseSchema),
  /**
   * The latest (recommended) release version. Always references an entry in `releases`.
   * Used by the host to determine whether an update is available.
   */
  latestVersion: Schema.String.pipe(Schema.nonEmptyString()),
});
export type PluginView = Schema.Schema.Type<typeof PluginViewSchema>;

/**
 * Response body of `GET /registry/plugins`.
 */
export const GetPluginsResponseBodySchema = Schema.Struct({
  /** Wire-format schema version, pinned to 2. */
  version: Schema.Literal(2),
  /** Hydrated entries. */
  plugins: Schema.Array(PluginViewSchema),
  /** Unix ms timestamp of the most recent successful index cycle. */
  refreshedAt: Schema.Number,
});
export type GetPluginsResponseBody = Schema.Schema.Type<typeof GetPluginsResponseBodySchema>;
