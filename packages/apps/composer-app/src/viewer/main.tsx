//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import * as Effect from 'effect/Effect';
import React from 'react';
import { createRoot } from 'react-dom/client';

import * as App from '@dxos/app-framework/App';
import * as Hooks from '@dxos/app-framework/Hooks';
import '@dxos/react-ui/theme.css';
import { log } from '@dxos/log';
import * as Observability from '@dxos/observability/Observability';
import * as PublicationLink from '@dxos/plugin-space/PublicationLink';
import * as PublicationManifest from '@dxos/plugin-space/PublicationManifest';

import { initAutomergeWasm, initEchoHostWasm } from '../util/automerge-wasm.ts';
import { initializeObservability, setupConfig } from '../util/config.ts';
import { APP_KEY } from '../util/constants.ts';
import { getPlugins } from './plugin-defs.viewer.tsx';
import { composerOriginOf, parseRoute, replaceWithSpace } from './route.ts';

const bootStatus = (text: string) => App.bootLoader?.status({ humanized: text });

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
  const startupSettled = new Promise<void>((resolve) => {
    window.addEventListener(Hooks.STARTUP_ACTIVATED_EVENT, () => resolve(), { once: true });
    window.addEventListener(Hooks.STARTUP_FAILED_EVENT, () => resolve(), { once: true });
  });
  const observability = initializeObservability(
    base,
    false,
    undefined,
    await Observability.isObservabilityDisabled(APP_KEY),
    undefined,
    Effect.promise(() => startupSettled),
  );
  const publicationsUrl =
    getEnvString(base, 'DX_PUBLICATIONS_URL') ??
    new URL(PublicationManifest.PUBLICATIONS_PATH, window.location.origin).toString();
  const composerOrigin = composerOriginOf(window.location.origin);

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
  const response = await fetch(PublicationLink.archiveUrl(publicationsUrl, route.publicId));
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
    observability,
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
