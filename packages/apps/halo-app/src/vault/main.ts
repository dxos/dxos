//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import {
  Client,
  ClientServicesProvider,
  ClientServicesProxy,
  IFrameHostRuntime,
  IFrameProxyRuntime,
  ShellRuntime
} from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { initializeAppTelemetry } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations, Shell } from '@dxos/react-ui';
import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

import { mobileAndTabletCheck } from '../util';

void initializeAppTelemetry('halo-vault', new Config(Defaults()));

const startShell = async (config: Config, runtime: ShellRuntime, services: ClientServicesProvider, origin: string) => {
  const { createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');

  const root = createRoot(document.getElementById('root')!);
  const client = new Client({ config, services });
  await client.initialize();

  // TODO(wittjosiah): StrictMode.
  root.render(
    createElement(
      ThemeProvider,
      { themeVariant: 'os', resourceExtensions: [osTranslations] },
      // NOTE: Using context provider directly to avoid duplicate banners being logged.
      createElement(ClientContext.Provider, { value: { client } }, createElement(Shell, { runtime, origin }))
    )
  );
};

const main = async () => {
  const params = new URLSearchParams(window.location.search);
  const shellDisabled = params.get('shell') === 'false';
  const config = new Config(await Dynamics(), Defaults());

  // TODO(wittjosiah): Remove mobile check once we can inspect shared workers in iOS Safari.
  if (mobileAndTabletCheck() || typeof SharedWorker === 'undefined') {
    console.log('Running DXOS vault in compatibility mode.');
    const iframeRuntime: IFrameHostRuntime = new IFrameHostRuntime({
      configProvider: config,
      appPort: createIFramePort({
        channel: 'dxos:app',
        onOrigin: async (origin) => {
          iframeRuntime.origin = origin;
          await iframeRuntime.start();
          iframeRuntime.shell && (await startShell(config, iframeRuntime.shell, iframeRuntime.services, origin));
        }
      }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' })
    });

    window.addEventListener('beforeunload', () => {
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
    const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), {
      type: 'module',
      name: 'dxos-vault'
    });
    const portMuxer = new PortMuxer(worker.port);

    let shellClientProxy: ClientServicesProvider;
    if (!shellDisabled) {
      shellClientProxy = new ClientServicesProxy(portMuxer.createWorkerPort({ channel: 'dxos:shell' }));
      void shellClientProxy.open();
    }

    const iframeRuntime: IFrameProxyRuntime = new IFrameProxyRuntime({
      // TODO(dmaretskyi): Extract channel names to config.ts.
      systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' }),
      workerAppPort: portMuxer.createWorkerPort({ channel: 'dxos:app' }),
      windowAppPort: createIFramePort({
        channel: 'dxos:app',
        onOrigin: async (origin) => {
          await iframeRuntime.open(origin);
          if (shellClientProxy && iframeRuntime.shell) {
            await startShell(config, iframeRuntime.shell, shellClientProxy, origin);
          }
        }
      }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' })
    });

    window.addEventListener('beforeunload', () => {
      iframeRuntime.close().catch((err: Error) => log.catch(err));
    });
  }
};

void main();
