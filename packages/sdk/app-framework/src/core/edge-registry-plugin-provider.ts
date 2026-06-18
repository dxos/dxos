//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type PluginView } from '@dxos/protocols';

import type * as Plugin from './plugin';
import * as Registry from './registry';

/**
 * Maps a wire-format `PluginView` (from `@dxos/protocols`) to a runtime `Plugin.Meta`: the nested
 * `profile` (the view's profile plus the resolved provenance `author`) and the latest `release`.
 *
 * This is the one translation seam between the nested wire view and the resolved runtime manifest.
 * `profile.key` is the composer plugin id — a valid NSID — so `DXN.make(profile.key, release.version)`
 * reconstructs the canonical plugin DXN.
 */
const toRegistryPlugin = (entry: PluginView): Plugin.Meta | null => {
  if (!entry.releases?.length) {
    return null;
  }
  const latestRelease = entry.releases.find((release) => release.version === entry.latestVersion) ?? entry.releases[0];
  return {
    profile: {
      ...entry.profile,
      // Provenance: the verified publisher is the author (handle preferred, DID fallback).
      author: entry.handle ?? entry.did,
    },
    release: latestRelease,
  };
};

/**
 * Implements `Registry.PluginProvider` against the Edge `/registry` HTTP endpoints.
 *
 * Lives in app-framework (rather than the more obvious home of `@dxos/edge-client`)
 * because edge-client doesn't depend on app-framework; siting the implementation
 * here keeps the dependency arrow `app-framework → edge-client` and avoids a
 * cycle. The class needs only the public `EdgeHttpClient` type, so a one-way
 * type-import is enough.
 *
 * `listVersions` is served directly from the `releases` array inlined on each
 * entry — no separate endpoint is needed.
 */
export class EdgeRegistryPluginProvider implements Registry.PluginProvider {
  // Cached on first load so getPlugin/listVersions can resolve without re-fetching.
  #cachedPlugins: readonly Plugin.Meta[] = [];
  #cachedEntries: readonly PluginView[] = [];

  constructor(private readonly _client: EdgeHttpClient) {}

  listPlugins(): Effect.Effect<readonly Plugin.Meta[], Error> {
    return Effect.tryPromise({
      try: () => this._client.getRegistryPlugins(Context.default()),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }).pipe(
      Effect.map((body) => {
        this.#cachedEntries = body.plugins;
        const plugins = body.plugins.map(toRegistryPlugin).filter((entry): entry is Plugin.Meta => entry !== null);
        this.#cachedPlugins = plugins;
        return plugins;
      }),
    );
  }

  listVersions(id: string): Effect.Effect<readonly Plugin.Release[], Error> {
    const entry = this.#cachedEntries.find((candidate) => candidate.profile.key === id);
    if (!entry) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${id}`));
    }
    // Releases are already `PluginRelease`-shaped on the wire view; serve them directly.
    return Effect.succeed(entry.releases);
  }

  getPlugin(id: string, version?: string): Effect.Effect<Plugin.Meta, Error> {
    const plugin = this.#cachedPlugins.find((candidate) => candidate.profile.key === id);
    if (!plugin) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${id}`));
    }
    if (version && version !== plugin.release?.version) {
      return Effect.fail(
        new Error(`Version ${version} not available for ${id}; only ${plugin.release?.version} is cached`),
      );
    }
    return Effect.succeed(plugin);
  }
}
