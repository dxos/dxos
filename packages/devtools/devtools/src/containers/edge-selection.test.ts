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

/** A build without accounts, such as a local `serve` with no `DX_HUB_URL`. */
const NO_ACCOUNTS_BUILD: ConfigInit = { runtime: { services: { edge: { url: `${EDGE_URLS.preview}/` } } } };

/** Persists a selection and returns the config the app reloads into: persisted settings over the build. */
const pick = (edgeUrl: string, build: ConfigInit, settings: ConfigInit = {}) => {
  const persisted = selectEdge(settings, new Config(settings, build), edgeUrl);
  return { persisted, config: new Config(persisted, build) };
};

describe('selectEdge', () => {
  test('moves the hub with EDGE', ({ expect }) => {
    // EDGE checks accounts against the hub it serves under `/hub`, so a hub left on the old EDGE is one it cannot see.
    const { config } = pick(EDGE_URLS.dev, DEV_COMPOSER_BUILD);
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.dev);
    expect(getEnvString(config, 'DX_HUB_URL')).toBe(`${EDGE_URLS.dev}/hub/`);
    expect(config.values.runtime?.services?.hub?.url).toBe(`${EDGE_URLS.dev}/hub/`);
  });

  test('lists the selected EDGE in the build env the config panel shows', ({ expect }) => {
    const { config } = pick(EDGE_URLS.dev, DEV_COMPOSER_BUILD);
    expect(getEnvString(config, 'DX_EDGE_BASE_URL')).toBe(`${EDGE_URLS.dev}/`);
  });

  test('picking the build EDGE again restores the pair', ({ expect }) => {
    const { persisted } = pick(EDGE_URLS.dev, DEV_COMPOSER_BUILD);
    const { config } = pick(EDGE_URLS.preview, DEV_COMPOSER_BUILD, persisted);
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.preview);
    expect(getEnvString(config, 'DX_HUB_URL')).toBe(`${EDGE_URLS.preview}/hub/`);
  });

  test('does not turn accounts on for a build without them', ({ expect }) => {
    const { config } = pick(EDGE_URLS.dev, NO_ACCOUNTS_BUILD);
    expect(getEnvString(config, 'DX_HUB_URL')).toBeUndefined();
    expect(config.values.runtime?.services?.hub?.url).toBe(`${EDGE_URLS.dev}/hub/`);
  });

  test('keeps other persisted settings', ({ expect }) => {
    const idb = defs.Runtime_Client_Storage_StorageDriver.IDB;
    const { config } = pick(EDGE_URLS.dev, DEV_COMPOSER_BUILD, {
      runtime: { client: { storage: { dataStore: idb } } },
    });
    expect(config.values.runtime?.client?.storage?.dataStore).toBe(idb);
  });
});
