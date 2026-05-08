//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CommunityPlugin, type CommunityPluginProvider, type CommunityPluginVersion } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type PluginEntry } from '@dxos/protocols';

/**
 * Maps a wire-format PluginEntry (protocols) to a CommunityPlugin (app-framework domain type).
 * This is the only translation seam between the two independently-defined type hierarchies.
 * Each field is mapped explicitly — there is no shared type between them.
 */
const toCommunityPlugin = (entry: PluginEntry): CommunityPlugin => ({
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
 * Implements CommunityPluginProvider backed by the Edge registry service.
 *
 * `listVersions` is currently a stub: it returns the single latest version derived
 * from the cached plugin list, so the picker has something to render. The wire
 * contract for the real endpoint already exists — see `GetPluginVersionsResponseBodySchema`
 * in `@dxos/protocols/edge/registry` and `EdgeHttpClient.getRegistryPluginVersions` —
 * so once Edge ships `GET /registry/plugins/:repo/versions`, swap this stub for a
 * call to `this._client.getRegistryPluginVersions(...)` and map each entry through
 * a `toCommunityPluginVersion` helper (mirror of {@link toCommunityPlugin}).
 */
export class EdgeCommunityPluginProvider implements CommunityPluginProvider {
  // Cached on first load so getPlugin/listVersions can resolve without re-fetching.
  #cachedPlugins: readonly CommunityPlugin[] = [];

  constructor(private readonly _client: EdgeHttpClient) {}

  listPlugins(): Effect.Effect<readonly CommunityPlugin[], Error> {
    return Effect.tryPromise({
      try: () => this._client.getRegistryPlugins(Context.default()),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }).pipe(
      Effect.map((body) => {
        const plugins = body.plugins.filter((entry) => entry.health === 'ok').map(toCommunityPlugin);
        this.#cachedPlugins = plugins;
        return plugins;
      }),
    );
  }

  listVersions(repo: string): Effect.Effect<readonly CommunityPluginVersion[], Error> {
    // Stub: return only the currently-known version until Edge implements the versions endpoint.
    const plugin = this.#cachedPlugins.find((candidate) => candidate.repo === repo);
    if (!plugin) {
      return Effect.fail(new Error(`Plugin not found in catalog: ${repo}`));
    }
    const version: CommunityPluginVersion = { tag: plugin.version, moduleUrl: plugin.moduleUrl };
    return Effect.succeed([version]);
  }

  getPlugin(repo: string, version?: string): Effect.Effect<CommunityPlugin, Error> {
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
