//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Config2 from '../Config2.ts';

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
  ...Config2.Plugin.fields,
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
 * A single installable release of a plugin, projected from a `plugin.release`
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
  /** Key of the parent `plugin.profile` record authored by the same DID (the plugin's NSID rkey). */
  pluginKey: Schema.optional(Schema.String),
  /** SHA-256 content hash of the published `manifest.json`, prefixed with `sha256-`. */
  manifestHash: Schema.optional(Schema.String),
  /** ISO-8601 timestamp from the ATProto record. */
  createdAt: Schema.optional(Schema.String),
});
export type PluginRelease = Schema.Schema.Type<typeof PluginReleaseSchema>;

/**
 * Verbatim content of a `plugin.profile` ATProto record. `key` is the record's rkey (a reverse-domain
 * NSID), denormalized into the body. Version-independent identity + display metadata; provenance
 * (`author`) is resolved separately from the publisher DID/handle.
 */
export const PluginProfileSchema = Schema.Struct({
  /** Reverse-domain NSID — the plugin's globally-unique key and the `plugin.profile` rkey (e.g. `org.dxos.plugin.excalidraw`). */
  key: Schema.String.pipe(Schema.nonEmptyString()),
  /** Plugin display name. */
  name: Schema.String.pipe(Schema.nonEmptyString()),
  /** Short description of plugin functionality. */
  description: Schema.optional(Schema.String),
  /** Publisher's homepage or plugin documentation URL. */
  homePage: Schema.optional(Schema.String),
  /** Source repository URL. */
  source: Schema.optional(Schema.String),
  /** Tags to help categorize the plugin. */
  tags: Schema.optional(Schema.Array(Schema.String)),
  /** Preview images — theme-keyed screenshot URLs shown on the plugin's card. */
  screenshots: Schema.optional(Schema.Array(Config2.Screenshot)),
  /** Icon identifier resolvable by `@ch-ui/icons` (e.g. `ph--sparkle--regular`), with an optional palette hue. */
  icon: Schema.optional(Config2.Icon),
  /** Composer plugin ids this plugin depends on at runtime (NSIDs). Author-declared, version-independent. */
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
  /** Relative path inside the package to a bundled MDL spec (consumed by plugin-code). */
  spec: Schema.optional(Schema.String),
  /** ISO-8601 timestamp from the ATProto record. */
  createdAt: Schema.optional(Schema.String),
});
export type PluginProfile = Schema.Schema.Type<typeof PluginProfileSchema>;

/**
 * A single hydrated plugin entry returned by `GET /registry/plugins`.
 *
 * This is an indexer-assembled *view* — analogous to emdash's `PackageView` — projected
 * from four ATProto record types: `plugin.profile`, `plugin.release`,
 * `publisher.profile`, and `publisher.verification`. It is NOT a direct serialization
 * of any single ATProto record.
 *
 * Design notes:
 * - `profile.key` is required to be a valid NSID (e.g. `org.dxos.plugin.excalidraw`), making it
 *   the single identifier for both PDS addressing and the composer runtime plugin id.
 *   `DXN.make(profile.key, latestVersion)` reconstructs the canonical plugin DXN.
 * - `releases` inlines all known versions, eliminating a separate versions round-trip for
 *   the version picker. Ordered newest-first.
 * - `latestVersion` is a convenience pointer into `releases` indicating the recommended
 *   install target.
 */
export const PluginViewSchema = Schema.Struct({
  // ── Addressing / provenance (indexer-derived) ────────────────────────────
  /**
   * `at://` URI of the source `plugin.profile` record.
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
  /** Unix ms when the indexer last assembled this entry. */
  indexedAt: Schema.Number,
  /**
   * Trust labels derived from curator `publisher.verification` records.
   * An empty array means the entry has no verification signal.
   */
  labels: Schema.Array(Schema.String),

  // ── Verbatim profile record content ─────────────────────────────────────
  profile: PluginProfileSchema,

  // ── Releases (projected from plugin.release records) ────────────────────
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

// ─── Publisher records ────────────────────────────────────────────────────────

/** Content of a `publisher.profile` ATProto record. Display metadata for a publisher DID. */
export const PublisherProfileSchema = Schema.Struct({
  displayName: Schema.String.pipe(Schema.nonEmptyString()),
  bio: Schema.optional(Schema.String),
  homepageUrl: Schema.optional(Schema.String),
  contact: Schema.optional(Schema.String),
});
export type PublisherProfile = Schema.Schema.Type<typeof PublisherProfileSchema>;

/**
 * Content of a `publisher.verification` record written by the curator DID.
 * Links a publisher DID to a trusted AT Protocol handle.
 */
export const PublisherVerificationSchema = Schema.Struct({
  subject: Schema.String.pipe(Schema.nonEmptyString()),
  handle: Schema.String.pipe(Schema.nonEmptyString()),
  displayName: Schema.String.pipe(Schema.nonEmptyString()),
  createdAt: Schema.String.pipe(Schema.nonEmptyString()),
});
export type PublisherVerification = Schema.Schema.Type<typeof PublisherVerificationSchema>;

// ─── NSID constants ───────────────────────────────────────────────────────────

/** NSID constants for the four `org.dxos.experimental.*` record collections. */
export const NSID = {
  PluginProfile: 'org.dxos.experimental.plugin.profile',
  PluginRelease: 'org.dxos.experimental.plugin.release',
  PublisherProfile: 'org.dxos.experimental.publisher.profile',
  PublisherVerification: 'org.dxos.experimental.publisher.verification',
} as const;

export type RegistryNsid = (typeof NSID)[keyof typeof NSID];

export const ALL_NSIDS: readonly RegistryNsid[] = [
  NSID.PluginProfile,
  NSID.PluginRelease,
  NSID.PublisherProfile,
  NSID.PublisherVerification,
];
