//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { type Root, createRoot } from 'react-dom/client';

// Next components style through `.dx-*` rules that ship separately from the theme.
import '@dxos/react-ui/theme.css';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as ResetDialog from '@dxos/app-toolkit/ResetDialog';
import { Client, type ClientServicesProvider, createClientServices } from '@dxos/client';
import { Config, Defaults, Envs, Local, defs } from '@dxos/config';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { showBootShell } from './boot-shell/index.ts';
import { getPlugins } from './plugins.ts';
import { dismissShell } from './shared/index.ts';

const createDedicatedWorker = () =>
  new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), { type: 'module', name: 'dxos-client-worker' });

// A SharedWorker elects one tab's dedicated worker as the OPFS owner, so a second tab proxies instead of locking out.
const createCoordinatorWorker = () =>
  new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-coordinator-worker',
  });

/** Wipes this device's identity and data, then starts the app afresh. */
const resetDevice = async (services: ClientServicesProvider) => {
  await services.services.SystemService?.reset();
  localStorage.clear();
  window.location.href = window.location.origin;
};

/**
 * The reset dialog in place of the app and its boot shell. Reset is offered once the client's services exist, since
 * only they can wipe what the client stored.
 */
const Fallback = ({ error, services }: { error: Error; services?: ClientServicesProvider }) => {
  useLayoutEffect(() => dismissShell(), []);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={dark ? 'dark' : 'light'} resourceExtensions={reactUiTranslations}>
      <ResetDialog.Root error={error} onReset={services ? () => resetDevice(services) : undefined} />
    </Theme.Provider>
  );
};

// What boot reached, for the dialog a boot failure shows.
let bootServices: ClientServicesProvider | undefined;
let reactRoot: Root | undefined;

const main = Effect.gen(function* () {
  performance.mark('diagram-app:main');
  showBootShell();
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
  bootServices = services;
  const client = new Client({ config, services });
  // Until `Main` mounts, a fatal error has nowhere to show but the log.
  let raiseFatalError = (error: Error) => log.error('fatal error before render', { error });
  const plugins = getPlugins({ client, config, services, onFatalError: (error) => raiseFatalError(error) });
  const defaults = plugins.map(({ meta }) => meta.profile.key);

  const Main = () => {
    const [fatalError, setFatalError] = useState<Error>();
    useEffect(() => {
      raiseFatalError = setFatalError;
    }, []);
    const App = Hooks.useApp({
      plugins,
      defaults,
      fallback: ({ error }) => <Fallback error={error} services={services} />,
    });
    // Rendered instead of the app, not thrown: `Main` sits above the app's error boundary.
    return fatalError ? <Fallback error={fatalError} services={services} /> : <App />;
  };

  const root = document.getElementById('root');
  if (!root) {
    return yield* Effect.die(new Error('#root element not found'));
  }
  reactRoot = createRoot(root);
  reactRoot.render(<Main />);
});

/** A boot that fails before the app renders shows the reset dialog in its place. */
const showBootFailure = (cause: Cause.Cause<unknown>) => {
  log.error('boot failed', { cause });
  const failure = Cause.squash(cause);
  const error = failure instanceof Error ? failure : new Error(String(failure));
  if (!reactRoot) {
    const container = document.getElementById('root') ?? document.body.appendChild(document.createElement('div'));
    reactRoot = createRoot(container);
  }
  reactRoot.render(<Fallback error={error} services={bootServices} />);
};

EffectEx.runDetached(main.pipe(Effect.tapCause((cause) => Effect.sync(() => showBootFailure(cause)))));
