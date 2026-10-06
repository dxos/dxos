//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config, type ConfigInit, EDGE_URLS, defs, getEnvString } from '@dxos/config';

import { type ConfigSources, orderConfigSources } from './config-sources.ts';

/** What `dev.composer.space` is built with: `DX_EDGE_BASE_URL` from `.github/workflows/env/dev`. */
const DEV_COMPOSER_BUILD: ConfigInit = { runtime: { services: { edge: { url: `${EDGE_URLS.preview}/` } } } };

/** What devtools' EDGE selector persists after picking "Dev". */
const DEV_EDGE_SELECTED: ConfigInit = { runtime: { services: { edge: { url: EDGE_URLS.dev } } } };

/** `dx-local.yml`'s EDGE, which a persisted selection may override. */
const LOCAL_DEFAULT: ConfigInit = { runtime: { services: { edge: { url: `${EDGE_URLS.preview}/` } } } };

/** A build with accounts: the config plugin copies `DX_HUB_URL` into the defaults' `runtime.app.env`. */
const PREVIEW_HUB: ConfigInit = { runtime: { app: { env: { DX_HUB_URL: `${EDGE_URLS.preview}/hub/` } } } };

const effectiveConfig = (sources: Partial<ConfigSources>) =>
  new Config(...orderConfigSources({ settings: {}, envs: {}, local: {}, defaults: {}, ...sources }));

describe('orderConfigSources', () => {
  test('a persisted EDGE selection cannot move a build that pins EDGE', ({ expect }) => {
    // A host on a persisted EDGE writes invitations that its guests, on the build's EDGE, cannot find.
    const config = effectiveConfig({ settings: DEV_EDGE_SELECTED, envs: DEV_COMPOSER_BUILD });
    expect(config.values.runtime?.services?.edge?.url).toBe(`${EDGE_URLS.preview}/`);
  });

  test('a persisted EDGE selection still applies when the build leaves EDGE open', ({ expect }) => {
    // `moon run composer-app:serve` without `DX_EDGE_BASE_URL`, where the selector is how a developer switches EDGE.
    const config = effectiveConfig({ settings: DEV_EDGE_SELECTED, local: LOCAL_DEFAULT });
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.dev);
  });

  test('other persisted settings still outrank the build', ({ expect }) => {
    const idb = defs.Runtime_Client_Storage_StorageDriver.IDB;
    const config = effectiveConfig({
      settings: { runtime: { client: { storage: { dataStore: idb } } } },
      envs: {
        runtime: {
          client: { storage: { dataStore: defs.Runtime_Client_Storage_StorageDriver.WEBFS } },
          services: DEV_COMPOSER_BUILD.runtime?.services,
        },
      },
    });
    expect(config.values.runtime?.client?.storage?.dataStore).toBe(idb);
  });

  test('the hub follows a persisted EDGE selection', ({ expect }) => {
    // EDGE checks accounts against the hub it serves under `/hub`; a hub left behind is one it cannot see.
    const config = effectiveConfig({ settings: DEV_EDGE_SELECTED, local: LOCAL_DEFAULT, defaults: PREVIEW_HUB });
    expect(config.values.runtime?.services?.edge?.url).toBe(EDGE_URLS.dev);
    expect(getEnvString(config, 'DX_HUB_URL')).toBe(`${EDGE_URLS.dev}/hub/`);
  });

  test('a build that pins EDGE keeps its own hub', ({ expect }) => {
    const config = effectiveConfig({ settings: DEV_EDGE_SELECTED, envs: DEV_COMPOSER_BUILD, defaults: PREVIEW_HUB });
    expect(getEnvString(config, 'DX_HUB_URL')).toBe(`${EDGE_URLS.preview}/hub/`);
  });

  test('a build without accounts is given no hub', ({ expect }) => {
    const config = effectiveConfig({ settings: DEV_EDGE_SELECTED, local: LOCAL_DEFAULT });
    expect(getEnvString(config, 'DX_HUB_URL')).toBeUndefined();
  });
});
