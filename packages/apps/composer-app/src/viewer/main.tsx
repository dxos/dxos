//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import * as App from '@dxos/app-framework/App';
import * as Hooks from '@dxos/app-framework/Hooks';
import '@dxos/react-ui/theme.css';
import { log } from '@dxos/log';
import * as Publication from '@dxos/plugin-space/Publication';

import { initAutomergeWasm, initEchoHostWasm } from '../util/automerge-wasm.ts';
import { setupConfig } from '../util/config.ts';
import { getPlugins } from './plugin-defs.viewer.tsx';
import { parseRoute, replaceWithSpace } from './route.ts';

const DEFAULT_COMPOSER_ORIGIN = 'https://composer.space';

const bootStatus = (text: string) => App.bootLoader?.status({ humanized: text });

/**
 * Boots a published space read-only: an in-memory client with a throwaway identity imports the bake,
 * and nothing is written to this origin's storage or sent to EDGE.
 */
const main = async () => {
  const route = parseRoute(window.location);
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('viewer: #root element not found');
  }
  if (!route) {
    root.textContent = 'This link does not name a published space.';
    App.bootLoader?.dismiss();
    return;
  }

  bootStatus('Starting…');
  const [{ Config, defs, getEnvString }, { Client, createClientServices }] = await Promise.all([
    import('@dxos/config'),
    import('@dxos/react-client'),
    initAutomergeWasm(),
  ]);
  await initEchoHostWasm();

  const base = await setupConfig();
  // The viewer's own host serves publications (the Worker reads them from EDGE).
  const publicationsUrl =
    getEnvString(base, 'DX_PUBLICATIONS_URL') ??
    new URL(Publication.PUBLICATIONS_PATH, window.location.origin).toString();
  const composerOrigin = getEnvString(base, 'DX_COMPOSER_URL') ?? DEFAULT_COMPOSER_ORIGIN;

  // Only the app env carries over: no EDGE services, no persistent storage.
  const config = new Config({
    version: 1,
    runtime: {
      app: base.values.runtime?.app,
      client: {
        servicesMode: defs.Runtime_Client_ServicesMode.HOST,
        storage: { persistent: false, sqliteMode: defs.Runtime_Client_Storage_SqliteMode.MEMORY },
      },
    },
  });
  const services = await createClientServices(config);
  const client = new Client({ config, services });
  await client.initialize();
  await client.halo.createIdentity();

  bootStatus('Fetching the published space…');
  const response = await fetch(Publication.archiveUrl(publicationsUrl, route.publicId));
  if (!response.ok) {
    root.textContent = 'This space is no longer published.';
    App.bootLoader?.dismiss();
    return;
  }
  const contents = new Uint8Array(await response.arrayBuffer());
  bootStatus('Opening…');
  const space = await client.spaces.import({ filename: `${route.publicId}.dx.json`, contents });
  replaceWithSpace(space.id, route);

  const plugins = getPlugins({
    client,
    config,
    services,
    publicId: route.publicId,
    composerOrigin,
  });
  const defaults = plugins.map(({ meta }) => meta.profile.key);
  const Main = () => {
    const AppRoot = Hooks.useApp({ plugins, defaults, debounce: 200 });
    return <AppRoot />;
  };
  createRoot(root).render(<Main />);
};

void main().catch((error) => log.catch(error));
