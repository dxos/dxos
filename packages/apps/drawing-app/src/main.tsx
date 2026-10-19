//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import * as Effect from 'effect/Effect';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Next components style through `.dx-*` rules that ship separately from the theme.
import '@dxos/react-ui/theme.css';
import * as Hooks from '@dxos/app-framework/Hooks';
import { Client, createClientServices } from '@dxos/client';
import { Config, Defaults, Envs, Local, defs } from '@dxos/config';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { getPlugins } from './plugins.ts';

const createDedicatedWorker = () =>
  new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), { type: 'module', name: 'dxos-client-worker' });

// A SharedWorker elects one tab's dedicated worker as the OPFS owner, so a second tab proxies instead of locking out.
const createCoordinatorWorker = () =>
  new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-coordinator-worker',
  });

const main = Effect.gen(function* () {
  performance.mark('drawing-app:main');
  const config = new Config(
    {
      runtime: {
        client: {
          servicesMode: defs.Runtime_Client_ServicesMode.DEDICATED_WORKER,
          storage: { persistent: true, sqliteMode: defs.Runtime_Client_Storage_SqliteMode.OPFS },
        },
      },
    },
    Envs(),
    Local(),
    Defaults(),
  );
  const services = yield* Effect.promise(() =>
    createClientServices(config, { createDedicatedWorker, createCoordinatorWorker }),
  );
  const client = new Client({ config, services });
  const plugins = getPlugins({ client, config, services });
  const defaults = plugins.map(({ meta }) => meta.profile.key);

  const Main = () => {
    const App = Hooks.useApp({ plugins, defaults });
    return <App />;
  };

  const root = document.getElementById('root');
  if (!root) {
    return yield* Effect.die(new Error('#root element not found'));
  }
  createRoot(root).render(<Main />);
});

EffectEx.runDetached(main.pipe(Effect.tapCause((cause) => Effect.sync(() => log.error('boot failed', { cause })))));
