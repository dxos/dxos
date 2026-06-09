//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type PluginView } from '@dxos/protocols';

import * as Registry from './registry';

/**
 * Maps a wire-format `PluginView` (from `@dxos/protocols`) to a
 * `Registry.Plugin` (the app-framework domain type).
 *
 * This is the only translation seam between the two independently-defined type
 * hierarchies — fields are mapped explicitly, with no shared type between them.
 *
 * `slug` serves as the composer plugin id: it is required to be a valid NSID
 * (e.g. `org.dxos.plugin.excalidraw`), so `DXN.make(slug, latestVersion)`
 * reconstructs the canonical `Plugin.Meta.key`.
 */
const toRegistryPlugin = (entry: PluginView): Registry.Plugin => {
  const latestRelease = entry.releases.find((release) => release.version === entry.latestVersion) ?? entry.releases[0];
  return {
    id: entry.slug,
    name: entry.profile.name,
    description: entry.profile.description,
    homePage: entry.profile.homepage,
    source: entry.profile.source,
    screenshots: entry.profile.screenshots ? [...entry.profile.screenshots] : undefined,
    tags: entry.profile.tags ? [...entry.profile.tags] : undefined,
    icon: entry.profile.icon,
    iconHue: entry.profile.iconHue,
    moduleUrl: latestRelease?.moduleUrl ?? '',
    version: entry.latestVersion,
  };
};

/**
 * Maps a wire-format `PluginView` release list to `Registry.PluginVersion[]`.
 */
const toRegistryVersions = (entry: PluginView): Registry.PluginVersion[] =>
  entry.releases.map((release) => ({
    tag: release.version,
    moduleUrl: release.moduleUrl,
  }));

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
  #cachedPlugins: readonly Registry.Plugin[] = [];
  #cachedEntries: readonly PluginView[] = [];

  constructor(private readonly _client: EdgeHttpClient) {}

  listPlugins(): Effect.Effect<readonly Registry.Plugin[], Error> {
    return Effect.tryPromise({
      try: () => this._client.getRegistryPlugins(Context.default()),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }).pipe(
      Effect.map((body) => {
        this.#cachedEntries = body.plugins;
        const plugins = body.plugins.map(toRegistryPlugin);
        this.#cachedPlugins = plugins;
        return plugins;
      }),
    );
  }

  listVersions(id: string): Effect.Effect<readonly Registry.PluginVersion[], Error> {
    const entry = this.#cachedEntries.find((candidate) => candidate.slug === id);
    if (!entry) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${id}`));
    }
    return Effect.succeed(toRegistryVersions(entry));
  }

  getPlugin(id: string, version?: string): Effect.Effect<Registry.Plugin, Error> {
    const plugin = this.#cachedPlugins.find((candidate) => candidate.id === id);
    if (!plugin) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${id}`));
    }
    if (version && version !== plugin.version) {
      return Effect.fail(new Error(`Version ${version} not available for ${id}; only ${plugin.version} is cached`));
    }
    return Effect.succeed(plugin);
  }
}
