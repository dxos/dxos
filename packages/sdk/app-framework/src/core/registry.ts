//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry as AtomRegistry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

/**
 * A registry plugin entry as seen by the plugin manager layer.
 * Populated from the registry catalog; represents the latest available version of a plugin.
 *
 * Independently defined from @dxos/protocols PluginView — similar shape but not the same type.
 * Implementations of {@link PluginProvider} (e.g. {@link EdgeRegistryPluginProvider})
 * are responsible for mapping their wire-format entries to this shape.
 */
export type Plugin = {
  /**
   * Composer plugin id — a bare NSID, e.g. `org.dxos.plugin.excalidraw`.
   * Equals `slug` on the wire-format PluginView. Used for `manager.enable(id)`,
   * `DXN.make(id, version)`, install-version tracking, and all catalog lookups.
   */
  id: string;
  name: string;
  description?: string;
  homePage?: string;
  source?: string;
  screenshots?: string[];
  tags?: string[];
  icon?: string;
  iconHue?: string;
  /**
   * IDs of plugins this entry declares as runtime dependencies. Mirrors
   * {@link Plugin.Meta.dependsOn}. Surfaced in the catalog so the manager can
   * resolve and auto-install transitive deps before they are first loaded.
   */
  dependsOn?: string[];
  /** URL to dynamic-import the latest version of this plugin module. */
  moduleUrl: string;
  /**
   * Latest known version string, e.g. `0.8.3`.
   * Combined with `id`, yields the canonical `Plugin.Meta.key` via `DXN.make(id, version)`.
   */
  version: string;
};

/**
 * A single installable version of a registry plugin.
 */
export type PluginVersion = {
  /** Version string, e.g. `v1.2.0`. */
  tag: string;
  /** URL to dynamic-import this specific version of the plugin module. */
  moduleUrl: string;
  /** Unix ms of when this version was published (optional; omitted when unknown). */
  releasedAt?: number;
};

/**
 * Abstraction over the plugin registry catalog backend.
 * Implementations may call Edge, a local cache, or a stub.
 *
 * The interface itself is transport-agnostic; concrete implementations live
 * alongside it in this package (see {@link EdgeRegistryPluginProvider}) so we
 * avoid `app-framework ↔ edge-client` cycles, but they only need to satisfy
 * this shape — callers can substitute their own.
 */
export interface PluginProvider {
  /**
   * Returns all registry plugins (latest version of each).
   */
  listPlugins(): Effect.Effect<readonly Plugin[], Error>;

  /**
   * Returns all known versions of a plugin, identified by its composer plugin id (NSID).
   * Ordered newest-first. Must return at least one entry.
   */
  listVersions(id: string): Effect.Effect<readonly PluginVersion[], Error>;

  /**
   * Returns a single plugin entry for the given id.
   * If `version` is omitted, returns the latest.
   * Fails if the plugin or version is not found.
   */
  getPlugin(id: string, version?: string): Effect.Effect<Plugin, Error>;
}

/**
 * Atomic snapshot of the registry catalog as observed by the host.
 * Exposed via {@link Manager.plugins} so consumers can subscribe reactively
 * (loading state, list contents, last error).
 */
export type PluginsState = {
  entries: readonly Plugin[];
  loading: boolean;
  error: Error | null;
};

/**
 * Default no-op provider used when no `PluginProvider` is supplied at construction
 * time (e.g. tests, stories, environments without an Edge connection).
 *
 * `listPlugins` returns an empty list (so `Manager.plugins` settles to a stable
 * empty state). `listVersions` and `getPlugin` fail with an explicit error so
 * callers know they need to configure a real provider.
 */
const NULL_PROVIDER: PluginProvider = {
  listPlugins: () => Effect.succeed([] as readonly Plugin[]),
  listVersions: () => Effect.fail(new Error('No plugin registry provider configured')),
  getPlugin: () => Effect.fail(new Error('No plugin registry provider configured')),
};

/**
 * Owns the cached registry catalog state and forwards `listVersions` / `getPlugin`
 * calls to the underlying {@link PluginProvider}. Lives on the `PluginManager`
 * (as `manager.pluginRegistry`) so consumers can reach it through the manager
 * without a separate capability lookup.
 *
 * On construction the manager kicks off a background fetch via `provider.listPlugins()`
 * and writes the result into the {@link plugins} atom. Subscribers see `loading: true`
 * during the fetch and `loading: false` once it settles.
 */
export class Manager {
  readonly plugins: Atom.Writable<PluginsState>;
  readonly #provider: PluginProvider;

  constructor(provider: PluginProvider | undefined, atomRegistry: AtomRegistry.Registry) {
    this.#provider = provider ?? NULL_PROVIDER;
    const initialLoading = provider !== undefined;
    this.plugins = Atom.make<PluginsState>({ entries: [], loading: initialLoading, error: null }).pipe(Atom.keepAlive);

    if (provider !== undefined) {
      // Fire-and-forget initial load. Errors are surfaced via the atom's `error` field.
      void EffectEx.runAndForwardErrors(
        provider.listPlugins().pipe(
          Effect.match({
            onSuccess: (entries) => atomRegistry.set(this.plugins, { entries, loading: false, error: null }),
            onFailure: (error) => {
              log.catch(error);
              atomRegistry.set(this.plugins, { entries: [], loading: false, error });
            },
          }),
        ),
      );
    }
  }

  /** Forwards to the underlying provider. */
  listPlugins(): Effect.Effect<readonly Plugin[], Error> {
    return this.#provider.listPlugins();
  }

  /** Forwards to the underlying provider. */
  listVersions(id: string): Effect.Effect<readonly PluginVersion[], Error> {
    return this.#provider.listVersions(id);
  }

  /** Forwards to the underlying provider. */
  getPlugin(id: string, version?: string): Effect.Effect<Plugin, Error> {
    return this.#provider.getPlugin(id, version);
  }
}
