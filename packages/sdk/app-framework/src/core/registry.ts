//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { PluginManagerError } from './plugin-manager/errors.ts';
import type * as Plugin from './plugin.ts';

/**
 * A registry catalog entry is a {@link Plugin.Meta} (profile + the latest release), the same
 * runtime type bundled plugins use. {@link PluginProvider} implementations (e.g.
 * {@link EdgeRegistryPluginProvider}) map their wire-format entries (`PluginView`) to this shape.
 * A single installable version is a {@link Plugin.Release}.
 */

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
  listPlugins(): Effect.Effect<readonly Plugin.Meta[], Error>;

  /**
   * Returns all known versions of a plugin, identified by its composer plugin id (NSID).
   * Ordered newest-first. Must return at least one entry.
   */
  listVersions(id: string): Effect.Effect<readonly Plugin.Release[], Error>;

  /**
   * Returns a single plugin entry for the given id.
   * If `version` is omitted, returns the latest.
   * Fails if the plugin or version is not found.
   */
  getPlugin(id: string, version?: string): Effect.Effect<Plugin.Meta, Error>;
}

/**
 * Atomic snapshot of the registry catalog as observed by the host.
 * Exposed via {@link Manager.plugins} so consumers can subscribe reactively
 * (loading state, list contents, last error).
 */
export type PluginsState = {
  entries: readonly Plugin.Meta[];
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
  listPlugins: () => Effect.succeed([] as readonly Plugin.Meta[]),
  listVersions: () => Effect.fail(new PluginManagerError({ message: 'No plugin registry provider configured' })),
  getPlugin: () => Effect.fail(new PluginManagerError({ message: 'No plugin registry provider configured' })),
};

/** Concatenates provider lists, keeping the first entry of each plugin key. */
const mergeByKey = (lists: readonly (readonly Plugin.Meta[])[]): Plugin.Meta[] => {
  const byKey = new Map<string, Plugin.Meta>();
  for (const entry of lists.flat()) {
    if (!byKey.has(entry.profile.key)) {
      byKey.set(entry.profile.key, entry);
    }
  }
  return [...byKey.values()];
};

/**
 * Owns the cached registry catalog state and forwards `listVersions` / `getPlugin`
 * calls to its {@link PluginProvider}s. Lives on the `PluginManager`
 * (as `manager.pluginRegistry`) so consumers can reach it through the manager
 * without a separate capability lookup.
 *
 * The catalog is the union of every provider's plugins: the one given at construction (the public
 * registry) and any added later with {@link addProvider}, such as the signed-in user's private
 * plugins, which cannot be listed until an identity exists. A key listed by more than one provider
 * resolves to the earliest.
 *
 * On construction, and again on {@link addProvider} or {@link refresh}, the manager lists every
 * provider and writes the merged result into the {@link plugins} atom. Subscribers see
 * `loading: true` during the fetch and `loading: false` once it settles.
 */
export class Manager {
  readonly plugins: Atom.Writable<PluginsState>;
  readonly #providers: PluginProvider[];
  readonly #atomRegistry: AtomRegistry.AtomRegistry;
  /** Bumped per {@link refresh}, so a slower earlier reload cannot overwrite a later one. */
  #generation = 0;

  constructor(provider: PluginProvider | undefined, atomRegistry: AtomRegistry.AtomRegistry) {
    this.#providers = provider ? [provider] : [];
    this.#atomRegistry = atomRegistry;
    this.plugins = Atom.make<PluginsState>({ entries: [], loading: provider !== undefined, error: null }).pipe(
      Atom.keepAlive,
    );
    if (provider !== undefined) {
      this.refresh();
    }
  }

  /** Adds a provider whose plugins join the catalog, and reloads it. */
  addProvider(provider: PluginProvider): void {
    this.#providers.push(provider);
    this.refresh();
  }

  /** Removes a provider added with {@link addProvider}, dropping its plugins from the catalog. */
  removeProvider(provider: PluginProvider): void {
    const index = this.#providers.indexOf(provider);
    if (index === -1) {
      return;
    }
    this.#providers.splice(index, 1);
    this.refresh();
  }

  /**
   * Reloads the catalog from every provider, in the background. A provider that fails contributes
   * nothing and its error is surfaced on the atom, so one unreachable backend does not hide the others.
   */
  refresh(): void {
    const generation = ++this.#generation;
    const current = this.#atomRegistry.get(this.plugins);
    this.#atomRegistry.set(this.plugins, { ...current, loading: true });
    void EffectEx.runAndForwardErrors(
      Effect.forEach(this.#providers, (provider) => Effect.result(provider.listPlugins())).pipe(
        Effect.map((results) => {
          if (generation !== this.#generation) {
            return;
          }
          const lists: (readonly Plugin.Meta[])[] = [];
          let error: Error | null = null;
          for (const result of results) {
            if (result._tag === 'Failure') {
              log.catch(result.failure);
              error ??= result.failure;
            } else {
              lists.push(result.success);
            }
          }
          this.#atomRegistry.set(this.plugins, { entries: mergeByKey(lists), loading: false, error });
        }),
      ),
    );
  }

  /** Lists every provider's plugins, merged as the catalog is. */
  listPlugins(): Effect.Effect<readonly Plugin.Meta[], Error> {
    return Effect.forEach(this.#providers, (provider) => provider.listPlugins()).pipe(Effect.map(mergeByKey));
  }

  /** Versions of `id` from the first provider that has it. */
  listVersions(id: string): Effect.Effect<readonly Plugin.Release[], Error> {
    return this.#firstOf((provider) => provider.listVersions(id));
  }

  /** The entry for `id` from the first provider that has it. */
  getPlugin(id: string, version?: string): Effect.Effect<Plugin.Meta, Error> {
    return this.#firstOf((provider) => provider.getPlugin(id, version));
  }

  #firstOf<A>(lookup: (provider: PluginProvider) => Effect.Effect<A, Error>): Effect.Effect<A, Error> {
    const [first, ...rest] = this.#providers.length > 0 ? this.#providers : [NULL_PROVIDER];
    return rest.reduce((effect, provider) => Effect.catch(effect, () => lookup(provider)), lookup(first));
  }
}
