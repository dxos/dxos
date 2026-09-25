//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Effect 4 removed `effect/GlobalValue`. This is a like-for-like replacement: a value memoised
// against a registry on `globalThis`, so duplicate copies of a module -- bundler chunk splitting,
// a dependency pulled in twice, a worker realm -- still share one instance.

const REGISTRY = Symbol.for('@dxos/effect/globalValue');

type Registry = Map<unknown, unknown>;

const registry = (): Registry => {
  const global = globalThis as Record<symbol, unknown>;
  return (global[REGISTRY] ??= new Map()) as Registry;
};

/**
 * Returns the value stored for `id`, computing and storing it on first use.
 *
 * @param id Stable identity for the value; equal ids share one instance process-wide.
 */
export const globalValue = <T>(id: unknown, compute: () => T): T => {
  const map = registry();
  if (!map.has(id)) {
    map.set(id, compute());
  }
  return map.get(id) as T;
};
