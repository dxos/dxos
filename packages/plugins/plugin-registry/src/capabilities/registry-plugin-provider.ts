//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type RegistryPlugin, type RegistryPluginProvider, type RegistryPluginVersion } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type PluginEntry } from '@dxos/protocols';

/**
 * Maps a wire-format PluginEntry (protocols) to a RegistryPlugin (app-framework domain type).
 * This is the only translation seam between the two independently-defined type hierarchies.
 * Each field is mapped explicitly — there is no shared type between them.
 */
const toRegistryPlugin = (entry: PluginEntry): RegistryPlugin => ({
  id: entry.meta.id,
  name: entry.meta.name,
  description: entry.meta.description,
  homePage: entry.meta.homePage,
  source: entry.meta.source,
  screenshots: entry.meta.screenshots ? [...entry.meta.screenshots] : undefined,
  tags: entry.meta.tags ? [...entry.meta.tags] : undefined,
  icon: entry.meta.icon,
  iconHue: entry.meta.iconHue,
  moduleUrl: entry.moduleUrl,
  repo: entry.repo,
  version: entry.releaseTag,
});

/**
 * Implements RegistryPluginProvider backed by the Edge registry service.
 *
 * `listVersions` is currently a stub: it returns the single latest version derived
 * from the cached plugin list, so the picker has something to render. The wire
 * contract for the real endpoint already exists — see `GetPluginVersionsResponseBodySchema`
 * in `@dxos/protocols/edge/registry` and `EdgeHttpClient.getRegistryPluginVersions` —
 * so once Edge ships `GET /registry/plugins/:repo/versions`, swap this stub for a
 * call to `this._client.getRegistryPluginVersions(...)` and map each entry through
 * a `toRegistryPluginVersion` helper (mirror of {@link toRegistryPlugin}).
 */
export class EdgeRegistryPluginProvider implements RegistryPluginProvider {
  // Cached on first load so getPlugin/listVersions can resolve without re-fetching.
  #cachedPlugins: readonly RegistryPlugin[] = [];

  constructor(private readonly _client: EdgeHttpClient) {}

  listPlugins(): Effect.Effect<readonly RegistryPlugin[], Error> {
    return Effect.tryPromise({
      try: () => this._client.getRegistryPlugins(Context.default()),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }).pipe(
      Effect.map((body) => {
        const plugins = body.plugins.filter((entry) => entry.health === 'ok').map(toRegistryPlugin);
        this.#cachedPlugins = plugins;
        return plugins;
      }),
    );
  }

  listVersions(repo: string): Effect.Effect<readonly RegistryPluginVersion[], Error> {
    // Stub: return only the currently-known version until Edge implements the versions endpoint.
    const plugin = this.#cachedPlugins.find((candidate) => candidate.repo === repo);
    if (!plugin) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${repo}`));
    }
    const version: RegistryPluginVersion = { tag: plugin.version, moduleUrl: plugin.moduleUrl };
    return Effect.succeed([version]);
  }

  getPlugin(repo: string, version?: string): Effect.Effect<RegistryPlugin, Error> {
    const plugin = this.#cachedPlugins.find((p) => p.repo === repo);
    if (!plugin) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${repo}`));
    }
    if (version && version !== plugin.version) {
      return Effect.fail(new Error(`Version ${version} not available for ${repo}; only ${plugin.version} is cached`));
    }
    return Effect.succeed(plugin);
  }
}
