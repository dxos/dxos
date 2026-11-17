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
import { Client, createClientServices } from '@dxos/client';
import { Config, Defaults, Envs, Local, defs } from '@dxos/config';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { clearIndexedDB, clearOPFS } from '@dxos/util';

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

/** Set by a reset the client could not run, so the next load wipes storage before anything opens it. */
const WIPE_ON_LOAD = 'org.dxos.diagram-app.wipe-on-load';

const wipeStorage = async () => {
  localStorage.clear();
  await clearOPFS();
  await clearIndexedDB();
};

/** Wipes this device's identity and data, then starts the app afresh. */
const resetDevice = async (client?: Client) => {
  const system = client?.servicesReady ? client.services.services.SystemService : undefined;
  if (system) {
    await system.reset();
    localStorage.clear();
  } else {
    sessionStorage.setItem(WIPE_ON_LOAD, 'true');
  }
  window.location.href = window.location.origin;
};

/** The reset dialog in place of the app and its boot shell. */
const Fallback = ({ error, client }: { error: Error; client?: Client }) => {
  useLayoutEffect(() => dismissShell(), []);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={dark ? 'dark' : 'light'} resourceExtensions={reactUiTranslations}>
      <ResetDialog.Root error={error} onReset={() => resetDevice(client)} />
    </Theme.Provider>
  );
};

// What boot reached, for the dialog a boot failure shows.
let bootClient: Client | undefined;
let reactRoot: Root | undefined;

const main = Effect.gen(function* () {
  performance.mark('diagram-app:main');
  if (sessionStorage.getItem(WIPE_ON_LOAD)) {
    sessionStorage.removeItem(WIPE_ON_LOAD);
    yield* Effect.promise(wipeStorage);
  }
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
  const client = new Client({ config, services });
  bootClient = client;
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
      fallback: ({ error }) => <Fallback error={error} client={client} />,
    });
    // Rendered instead of the app, not thrown: `Main` sits above the app's error boundary.
    return fatalError ? <Fallback error={fatalError} client={client} /> : <App />;
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
  reactRoot.render(<Fallback error={error} client={bootClient} />);
};

EffectEx.runDetached(main.pipe(Effect.tapCause((cause) => Effect.sync(() => showBootFailure(cause)))));
