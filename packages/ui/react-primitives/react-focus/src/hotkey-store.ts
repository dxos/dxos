//
// Copyright 2026 DXOS.org
//

// Imports `@zag-js/hotkeys` rather than `@ark-ui/react` deliberately: this module is reachable from
// plugins that declare `node`/`workerd` environments (`AttentionPlugin`'s keyboard capability sets
// the active scope), and `check-module-structure` fails the build if those transitively import
// React. The React layer lives in `./hotkeys`.

import {
  type CommandDefinition,
  type HotkeyStore,
  type HotkeyStoreOptions,
  createHotkeyStore as createStore,
  normalizeHotkey,
} from '@zag-js/hotkeys';

export { formatHotkey, normalizeHotkey, parseHotkey } from '@zag-js/hotkeys';

export type { CommandDefinition, HotkeyCommand, HotkeyOptions, HotkeyStore, ParsedHotkey } from '@zag-js/hotkeys';

/**
 * A store that leaves conflict reporting to `registerHotkey`.
 *
 * Ark compares only the hotkey and the DOM target, so bindings that can never both be active — one
 * `space.rename` per space, each scoped to its own — warn against each other, once per pair, on
 * every graph sync. Scopes are what decide a collision here, and only `registerHotkey` knows them.
 */
export const createHotkeyStore = (options?: HotkeyStoreOptions): HotkeyStore =>
  createStore({ ...options, conflictBehavior: 'allow' });

/**
 * The one store every DXOS binding registers on.
 *
 * Ark's own default store is module-private and only reachable from React, so a second store would
 * split the registry in two — bindings registered from an Effect capability would never see the
 * ones registered from a component. Everything here defaults to this instance instead.
 */
export const hotkeyStore: HotkeyStore = createHotkeyStore();

/** Start listening. The React hooks do this themselves; a non-React caller has to say so. */
export const initHotkeys = (target: Document | ShadowRoot = document): void => {
  hotkeyStore.init({ target });
};

/**
 * Stop listening and drop every registration.
 *
 * This is the whole app's store, so a single owner tearing it down takes every other component's
 * bindings with it. Only a root that called `initHotkeys` should call this — a capability or story
 * that merely registered commands unregisters those instead.
 */
export const destroyHotkeys = (): void => {
  hotkeyStore.destroy();
};

// Scopes are shared: two groups can hold overlapping chains (`root/a` and `root/a/b` both hold
// `root`), so the last holder — not the first to unmount — is what retires one. Keyed by store,
// since `holdHotkeyScope` takes one: a count shared across stores would let a release in one leave
// the scope active in another, with its commands still firing.
const scopeHolders = new WeakMap<HotkeyStore, Map<string, number>>();

const holdersOf = (store: HotkeyStore): Map<string, number> => {
  let holders = scopeHolders.get(store);
  if (!holders) {
    holders = new Map();
    scopeHolders.set(store, holders);
  }
  return holders;
};

/** Hold `path` and its ancestors active, returning the release for whichever holder is last out. */
export const holdHotkeyScope = (path: string, store: HotkeyStore = hotkeyStore): (() => void) => {
  const scopes = scopeChain(path);
  const holders = holdersOf(store);
  for (const scope of scopes) {
    holders.set(scope, (holders.get(scope) ?? 0) + 1);
    store.addScope(scope);
  }

  return () => {
    for (const scope of scopes) {
      const held = (holders.get(scope) ?? 1) - 1;
      if (held > 0) {
        holders.set(scope, held);
      } else {
        holders.delete(scope);
        store.removeScope(scope);
      }
    }
  };
};

/** Graph root segment; matches `@dxos/plugin-graph` `Node.RootId`. */
export const GRAPH_ROOT_ID = 'root';

/** Scope separator, matching the graph paths bindings are registered under. */
const SEPARATOR = '/';

/** The store's always-active scope, which is also what an unscoped command registers under. */
export const WILDCARD_SCOPE = '*';

/**
 * Nest an attendable segment under the graph root so a plank's scope also activates root-level
 * bindings. An empty or absent segment resolves to the graph root itself.
 */
export const nestHotkeyScope = (segment?: string): string =>
  segment
    ? segment === GRAPH_ROOT_ID || segment.startsWith(`${GRAPH_ROOT_ID}${SEPARATOR}`)
      ? segment
      : `${GRAPH_ROOT_ID}${SEPARATOR}${segment}`
    : GRAPH_ROOT_ID;

/**
 * Every prefix of a path, root first: `a/b/c` -> `a`, `a/b`, `a/b/c`.
 *
 * Ark's scopes are a flat active set rather than a hierarchy, so inheritance is expressed by
 * activating each ancestor alongside the leaf — which is what keeps a binding registered on the
 * graph root firing while a plank is attended.
 */
export const scopeChain = (path: string): string[] => {
  const segments = path.split(SEPARATOR).filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join(SEPARATOR));
};

/**
 * Make `path` and its ancestors the active scopes, retiring whichever were active before. Diffed
 * rather than cleared so a scope that survives the change is never momentarily inactive.
 */
export const setHotkeyScope = (path?: string, store: HotkeyStore = hotkeyStore): void => {
  const next = new Set(path ? scopeChain(path) : []);
  for (const scope of store.getActiveScopes()) {
    // The wildcard is the store's own always-active scope; it is not ours to retire.
    if (scope !== WILDCARD_SCOPE && !next.has(scope)) {
      store.removeScope(scope);
    }
  }
  for (const scope of next) {
    store.addScope(scope);
  }
};

/**
 * The most specific active scope — the leaf `setHotkeyScope` was last called with, since it
 * activates every ancestor alongside it. `undefined` when only the store's wildcard is active.
 */
export const getHotkeyScope = (store: HotkeyStore = hotkeyStore): string | undefined =>
  store
    .getActiveScopes()
    .filter((scope: string) => scope !== WILDCARD_SCOPE)
    .sort((a: string, b: string) => b.length - a.length)[0];

/**
 * Whether two scopes can be active at the same moment.
 *
 * `setHotkeyScope` activates a whole chain, so an ancestor is live whenever its descendant is —
 * `root` and `root/plank-1` collide. Siblings never are.
 */
const scopesIntersect = (left: string, right: string): boolean =>
  left === WILDCARD_SCOPE ||
  right === WILDCARD_SCOPE ||
  left === right ||
  left.startsWith(`${right}${SEPARATOR}`) ||
  right.startsWith(`${left}${SEPARATOR}`);

/** A command's scopes as the store stores them; Ark accepts a bare string and defaults to the wildcard. */
const scopesOf = (scopes: string | readonly string[] | undefined): readonly string[] =>
  typeof scopes === 'string' ? [scopes] : scopes?.length ? scopes : [WILDCARD_SCOPE];

/**
 * Register a command, warning only about a hotkey that can actually fire alongside another.
 *
 * Registration goes through here rather than `store.register` so the store can stay on
 * `conflictBehavior: 'allow'`; see `createHotkeyStore`.
 */
export const registerHotkey = (command: CommandDefinition, store: HotkeyStore = hotkeyStore): void => {
  // Unregister first: the store warns on a duplicate id rather than replacing, and both callers
  // re-register the same ids whenever their source changes.
  store.unregister(command.id);

  const hotkey = normalizeHotkey(command.hotkey);
  const scopes = scopesOf(command.scopes);
  for (const existing of store.getState().commands.values()) {
    if (
      normalizeHotkey(existing.hotkey) !== hotkey ||
      existing.options?.target !== command.options?.target ||
      !scopesOf(existing.scopes).some((scope) => scopes.some((other) => scopesIntersect(scope, other)))
    ) {
      continue;
    }

    // eslint-disable-next-line no-console
    console.warn(
      `[hotkeys] Conflict: "${hotkey}" is already registered by command "${existing.id}" in an overlapping scope. Command "${command.id}" will also respond to this hotkey.`,
    );
  }

  store.register({ ...command, hotkey });
};
