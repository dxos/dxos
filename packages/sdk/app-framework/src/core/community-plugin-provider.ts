//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * A community plugin entry as seen by the plugin manager layer.
 * Populated from the registry catalog; represents the latest available version of a plugin.
 *
 * Independently defined from @dxos/protocols PluginEntry — similar shape but not the same type.
 * EdgeCommunityPluginProvider maps PluginEntry → CommunityPlugin.
 */
export type CommunityPlugin = {
  id: string;
  name: string;
  description?: string;
  homePage?: string;
  source?: string;
  screenshots?: string[];
  tags?: string[];
  icon?: string;
  iconHue?: string;
  /** URL to dynamic-import the latest version of this plugin module. */
  moduleUrl: string;
  /** GitHub repository slug, e.g. `owner/name`. Used to fetch version history. */
  repo: string;
  /**
   * Latest known version string, e.g. `v1.2.0`.
   * Corresponds to releaseTag in the wire-format PluginEntry; named `version` here
   * because the plugin manager layer speaks versions, not release tags.
   */
  version: string;
};

/**
 * A single installable version of a community plugin.
 */
export type CommunityPluginVersion = {
  /** Version string, e.g. `v1.2.0`. */
  tag: string;
  /** URL to dynamic-import this specific version of the plugin module. */
  moduleUrl: string;
  /** Unix ms of when this version was published (optional; omitted when unknown). */
  releasedAt?: number;
};

/**
 * Abstraction over the community plugin catalog backend.
 * Implementations may call Edge, a local cache, or a stub.
 *
 * Defined in app-framework so neither the interface nor its consumers depend on
 * @dxos/edge-client or @dxos/protocols. EdgeCommunityPluginProvider (in plugin-registry)
 * is responsible for translating wire-format types to these domain types.
 */
export interface CommunityPluginProvider {
  /**
   * Returns all healthy community plugins (latest version of each).
   */
  listPlugins(): Effect.Effect<readonly CommunityPlugin[], Error>;

  /**
   * Returns all known versions of a plugin identified by its GitHub repo slug.
   * Until the Edge backend implements a versions endpoint, implementations MUST
   * return at least one entry representing the current/latest release.
   */
  listVersions(repo: string): Effect.Effect<readonly CommunityPluginVersion[], Error>;

  /**
   * Returns a single plugin entry for the given repo.
   * If `version` is omitted, returns the latest.
   * Fails if the specified version is not found.
   */
  getPlugin(repo: string, version?: string): Effect.Effect<CommunityPlugin, Error>;
}
