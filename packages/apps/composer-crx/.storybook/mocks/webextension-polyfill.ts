//
// Copyright 2024 DXOS.org
//

// Storybook-only stub for `webextension-polyfill`. The real module throws on import outside a
// browser extension ("This script should only be loaded in a browser extension."), which would
// crash any story that (transitively) imports it. This provides an in-memory `browser` so the
// extension-coupled components mount; storage actually persists within a session so stories can
// seed data via `browser.storage.*.set` in a loader.

const makeArea = () => {
  const store: Record<string, unknown> = {};
  return {
    get: async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) {
        return { ...store };
      }
      const names = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      return Object.fromEntries(names.filter((key) => key in store).map((key) => [key, store[key]]));
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    },
    remove: async (keys: string | string[]) => {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete store[key]);
    },
  };
};

const listener = { addListener: () => {}, removeListener: () => {}, hasListener: () => false };

const browser = {
  storage: { local: makeArea(), sync: makeArea(), onChanged: listener },
  tabs: {
    query: async () => [],
    sendMessage: async () => undefined,
    create: async () => ({}),
    update: async () => ({}),
    onActivated: listener,
    onUpdated: listener,
  },
  runtime: {
    id: 'storybook',
    sendMessage: async () => undefined,
    getManifest: () => ({ content_scripts: [] }),
    onMessage: listener,
    onInstalled: listener,
    onStartup: listener,
  },
  windows: { update: async () => ({}) },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  scripting: { executeScript: async () => [] },
  contextMenus: { create: () => {}, onClicked: listener },
  notifications: { create: async () => '' },
};

export default browser;
