//
// Copyright 2022 DXOS.org
//

import { StrictMode } from 'react';

import { Client, ClientServicesProvider, ClientServicesProxy } from '@dxos/client';
import { fromHost, IFrameHostRuntime, IFrameProxyRuntime, ShellRuntime } from '@dxos/client-services';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { ThemeProvider } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { osTranslations, Shell } from '@dxos/react-ui';
import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

import { mobileAndTabletCheck } from './util';

const startShell = async (config: Config, runtime: ShellRuntime, services: ClientServicesProvider, origin: string) => {
  const { createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');

  const root = createRoot(document.getElementById('root')!);
  const client = new Client({ config, services });
  await client.initialize();

  root.render(
    createElement(
      StrictMode,
      {},
      createElement(
        ThemeProvider,
        { themeVariant: 'os', resourceExtensions: [osTranslations] },
        // NOTE: Using context provider directly to avoid duplicate banners being logged.
        createElement(ClientContext.Provider, { value: { client } }, createElement(Shell, { runtime, origin }))
      )
    )
  );
};

export const startIFrameRuntime = async (getWorker: () => SharedWorker): Promise<void> => {
  // Handle reset path.
  const reset = window.location.hash === '#reset';
  if (reset) {
    return forceClientReset();
  }

  // Start iframe runtime.
  const shellDisabled = window.location.hash === '#disableshell';
  const config = new Config(await Dynamics(), Defaults());

  // TODO(wittjosiah): Remove mobile check once we can inspect shared workers in iOS Safari.
  if (mobileAndTabletCheck() || typeof SharedWorker === 'undefined') {
    console.log('Running DXOS vault in compatibility mode.');
    const iframeRuntime: IFrameHostRuntime = new IFrameHostRuntime({
      config,
      appPort: createIFramePort({
        channel: 'dxos:app',
        onOrigin: async (origin) => {
          iframeRuntime.origin = origin;
        }
      }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' })
    });

    await iframeRuntime.start();
    iframeRuntime.shell &&
      iframeRuntime.origin &&
      (await startShell(config, iframeRuntime.shell, iframeRuntime.services, iframeRuntime.origin));

    window.addEventListener('beforeunload', () => {
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    const portMuxer = new PortMuxer(getWorker().port);

    let shellClientProxy: ClientServicesProvider;
    if (!shellDisabled) {
      shellClientProxy = new ClientServicesProxy(portMuxer.createWorkerPort({ channel: 'dxos:shell' }));
      void shellClientProxy.open();
    }

    const iframeRuntime: IFrameProxyRuntime = new IFrameProxyRuntime({
      config,
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

/**
 * Resets client storage directly via the host and renders message on completion.
 */
const forceClientReset = async () => {
  const config = new Config(Defaults());

  // TODO(wittjosiah): This doesn't work with WebFS adapter because files aren't loaded yet.
  // const services = new ClientServicesHost({ config });
  // await services.reset();

  const client = new Client({ config, services: fromHost(config) });
  await client.initialize();
  await client.reset();

  // TODO(wittjosiah): Make this look nicer.
  const message = document.createElement('div');
  message.textContent = 'Client storage has been reset. Return to the app and reload.';
  document.body.appendChild(message);
};
