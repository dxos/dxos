//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config, type ConfigInit, EDGE_URLS, defs, getEnvString } from '@dxos/config';

import { selectEdge } from './edge-selection.ts';

/** What `dev.composer.space` is built with (`.github/workflows/env/dev`), laid out as the config plugin does. */
const DEV_COMPOSER_BUILD: ConfigInit = {
  runtime: {
    services: { edge: { url: `${EDGE_URLS.preview}/` } },
    app: { env: { DX_EDGE_BASE_URL: `${EDGE_URLS.preview}/`, DX_HUB_URL: `${EDGE_URLS.preview}/hub/` } },
  },
};

/** Persists a selection and returns the config the app reloads into: persisted settings over the build. */
const pick = (edgeUrl: string, settings: ConfigInit = {}) => {
  const persisted = selectEdge(settings, edgeUrl);
  return { persisted, config: new Config(persisted, DEV_COMPOSER_BUILD) };
};

describe('selectEdge', () => {
  test('moves the hub entry with EDGE', ({ expect }) => {
    // EDGE checks accounts against the hub it serves under `/hub`, so a hub left on the old EDGE is one it cannot see.
    const { config } = pick(EDGE_URLS.dev);
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.dev);
    expect(config.values.runtime?.services?.hub?.url).toBe(`${EDGE_URLS.dev}/hub/`);
  });

  test('leaves the build env alone', ({ expect }) => {
    const { persisted, config } = pick(EDGE_URLS.dev);
    expect(persisted.runtime?.app).toBeUndefined();
    expect(getEnvString(config, 'DX_EDGE_BASE_URL')).toBe(`${EDGE_URLS.preview}/`);
    expect(getEnvString(config, 'DX_HUB_URL')).toBe(`${EDGE_URLS.preview}/hub/`);
  });

  test('picking another EDGE moves both entries again', ({ expect }) => {
    const { persisted } = pick(EDGE_URLS.dev);
    const { config } = pick(EDGE_URLS.preview, persisted);
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.preview);
    expect(config.values.runtime?.services?.hub?.url).toBe(`${EDGE_URLS.preview}/hub/`);
  });

  test('keeps other persisted settings', ({ expect }) => {
    const idb = defs.Runtime_Client_Storage_StorageDriver.IDB;
    const { config } = pick(EDGE_URLS.dev, { runtime: { client: { storage: { dataStore: idb } } } });
    expect(config.values.runtime?.client?.storage?.dataStore).toBe(idb);
  });
});
