//
// Copyright 2026 DXOS.org
//

// Imports `@zag-js/hotkeys` rather than `@ark-ui/react` deliberately: this module is reachable from
// plugins that declare `node`/`workerd` environments (`AttentionPlugin`'s keyboard capability sets
// the active scope), and `check-module-structure` fails the build if those transitively import
// React. The React layer lives in `./hotkeys`.

import { type HotkeyStore, createHotkeyStore } from '@zag-js/hotkeys';

export { createHotkeyStore, formatHotkey, normalizeHotkey, parseHotkey } from '@zag-js/hotkeys';

export type { CommandDefinition, HotkeyCommand, HotkeyOptions, HotkeyStore, ParsedHotkey } from '@zag-js/hotkeys';

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

/** Stop listening and drop every registration. */
export const destroyHotkeys = (): void => {
  hotkeyStore.destroy();
};

/** Graph root segment; matches `@dxos/plugin-graph` `Node.RootId`. */
export const GRAPH_ROOT_ID = 'root';

/** Scope separator, matching the graph paths bindings are registered under. */
const SEPARATOR = '/';

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
    if (scope !== '*' && !next.has(scope)) {
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
    .filter((scope: string) => scope !== '*')
    .sort((a: string, b: string) => b.length - a.length)[0];
