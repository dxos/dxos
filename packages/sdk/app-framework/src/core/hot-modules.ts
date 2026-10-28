//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

/**
 * Export the dev-server transform adds to every lazily loaded module body; its value is a stable
 * per-file key, which is how a hot update finds the modules that loaded that file.
 */
export const HOT_KEY_EXPORT = '__dxHotKey';

/** The subset of the plugin manager a hot update drives. */
type Reloadable = {
  reload(moduleIds: readonly string[]): Effect.Effect<boolean, Error>;
  reloadPlugin(id: string): Effect.Effect<boolean, Error>;
};

type FileEntry = {
  /** Modules whose body is this file. */
  readonly moduleIds: Set<string>;
  /** Lazy plugins whose definition is this file. */
  readonly pluginIds: Set<string>;
  latest?: unknown;
};

type State = {
  readonly files: Map<string, FileEntry>;
  readonly managers: Set<WeakRef<Reloadable>>;
  queue: Promise<void>;
};

/**
 * Runtime half of plugin-module hot replacement, called by the code the dev transform injects:
 * module bodies hand over each new version, and loaders ask for the newest one.
 */
export type HotRuntime = {
  /** Whether any module has loaded the file; the handler propagates the update otherwise. */
  has(key: string): boolean;
  update(key: string, namespace: unknown): Promise<void>;
  /** The newest version of the file a loader just imported, or undefined when it has not changed. */
  latest(namespace: unknown): unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __DX_HOT_MODULES__: (HotRuntime & { readonly state: State }) | undefined;
}

// Held on the global so it survives this module itself being hot-replaced.
const state: State = globalThis.__DX_HOT_MODULES__?.state ?? {
  files: new Map(),
  managers: new Set(),
  queue: Promise.resolve(),
};

const keyOf = (namespace: unknown): string | undefined => {
  if (typeof namespace !== 'object' || namespace === null || !(HOT_KEY_EXPORT in namespace)) {
    return undefined;
  }
  const key = namespace[HOT_KEY_EXPORT];
  return typeof key === 'string' ? key : undefined;
};

const update = (key: string, namespace: unknown): Promise<void> => {
  // Serialized: a second save must not tear down modules the first is still re-activating.
  state.queue = state.queue.then(async () => {
    const entry = state.files.get(key);
    if (!entry) {
      return;
    }
    entry.latest = namespace;
    const moduleIds = [...entry.moduleIds];
    const pluginIds = [...entry.pluginIds];
    log.info('hot update', { file: key, modules: moduleIds, plugins: pluginIds });
    for (const ref of state.managers) {
      const manager = ref.deref();
      if (!manager) {
        state.managers.delete(ref);
        continue;
      }
      for (const pluginId of pluginIds) {
        await EffectEx.runPromise(manager.reloadPlugin(pluginId)).catch((error) =>
          log.error('hot update failed', { file: key, plugin: pluginId, error }),
        );
      }
      if (moduleIds.length > 0) {
        await EffectEx.runPromise(manager.reload(moduleIds)).catch((error) =>
          log.error('hot update failed', { file: key, error }),
        );
      }
    }
  });
  return state.queue;
};

const latest = (namespace: unknown): unknown => {
  const key = keyOf(namespace);
  return key === undefined ? undefined : state.files.get(key)?.latest;
};

globalThis.__DX_HOT_MODULES__ = { has: (key) => state.files.has(key), update, latest, state };

/** Registers a manager to receive hot updates; held weakly so a disposed manager is collected. */
export const register = (manager: Reloadable): void => {
  state.managers.add(new WeakRef(manager));
};

const entryFor = (namespace: unknown): FileEntry | undefined => {
  const key = keyOf(namespace);
  if (key === undefined) {
    return undefined;
  }
  let entry = state.files.get(key);
  if (!entry) {
    entry = { moduleIds: new Set(), pluginIds: new Set() };
    state.files.set(key, entry);
  }
  return entry;
};

/**
 * Records that a module loaded a body, so an update of that file re-runs the module. Bodies the dev
 * transform did not touch carry no key, so production builds pay one property check. A loader wrapper
 * that rebuilds the namespace must spread it, or the key is lost and its module never hot-reloads.
 */
export const track = (namespace: unknown, moduleId: string | undefined): void => {
  if (moduleId !== undefined) {
    entryFor(namespace)?.moduleIds.add(moduleId);
  }
};

/** Records that a lazy plugin was defined by a file, so an update of that file re-creates the plugin. */
export const trackPlugin = (namespace: unknown, pluginId: string): void => {
  entryFor(namespace)?.pluginIds.add(pluginId);
};
