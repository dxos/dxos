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
};

type FileEntry = {
  readonly replacers: Set<(namespace: unknown) => void>;
  readonly moduleIds: Set<string>;
};

type State = {
  readonly files: Map<string, FileEntry>;
  readonly managers: Set<WeakRef<Reloadable>>;
  queue: Promise<void>;
};

/**
 * Runtime half of plugin-module hot replacement, called by the accept handler the dev transform
 * injects into each module body with the file's key and its freshly evaluated namespace.
 */
export type HotRuntime = {
  /** Whether any module has loaded the file; the handler propagates the update otherwise. */
  has(key: string): boolean;
  update(key: string, namespace: unknown): Promise<void>;
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

const update = (key: string, namespace: unknown): Promise<void> => {
  // Serialized: a second save must not tear down modules the first is still re-activating.
  state.queue = state.queue.then(async () => {
    const entry = state.files.get(key);
    if (!entry) {
      return;
    }
    entry.replacers.forEach((replace) => replace(namespace));
    const moduleIds = [...entry.moduleIds];
    log.info('hot update', { file: key, modules: moduleIds });
    for (const ref of state.managers) {
      const manager = ref.deref();
      if (!manager) {
        state.managers.delete(ref);
        continue;
      }
      await EffectEx.runPromise(manager.reload(moduleIds)).catch((error) =>
        log.error('hot update failed', { file: key, error }),
      );
    }
  });
  return state.queue;
};

globalThis.__DX_HOT_MODULES__ = { has: (key) => state.files.has(key), update, state };

/** Registers a manager to receive hot updates; held weakly so a disposed manager is collected. */
export const register = (manager: Reloadable): void => {
  state.managers.add(new WeakRef(manager));
};

/**
 * A new version of the same file has the same exports, which is the only thing the update path
 * can know about it; checking for `default` keeps a malformed update from replacing a good body.
 */
const isSameModule = <T extends { readonly default: unknown }>(value: unknown): value is T =>
  typeof value === 'object' && value !== null && 'default' in value;

/**
 * Wraps a lazy module's loader so it returns the newest hot-updated version of its file. After an
 * update the browser keeps serving the original URL's stale instance, so the new namespace has to
 * be carried here. Bodies the dev transform did not touch carry no key and are never tracked.
 */
export const hotLoader = <T extends { readonly default: unknown }>(
  loader: () => Promise<T>,
): ((moduleId: string | undefined) => Promise<T>) => {
  let latest: T | undefined;
  const replace = (namespace: unknown) => {
    if (isSameModule<T>(namespace)) {
      latest = namespace;
    }
  };

  return async (moduleId) => {
    const namespace = latest ?? (await loader());
    const key = HOT_KEY_EXPORT in namespace ? namespace[HOT_KEY_EXPORT] : undefined;
    if (typeof key === 'string' && moduleId !== undefined) {
      let entry = state.files.get(key);
      if (!entry) {
        entry = { replacers: new Set(), moduleIds: new Set() };
        state.files.set(key, entry);
      }
      entry.replacers.add(replace);
      entry.moduleIds.add(moduleId);
    }
    return namespace;
  };
};
