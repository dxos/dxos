//
// Copyright 2022 DXOS.org
//

import { StrictMode } from 'react';

import { Trigger } from '@dxos/async';
import { Client, ClientServicesProvider, ClientServicesProxy, DEFAULT_INTERNAL_CHANNEL } from '@dxos/client';
import { fromHost, IFrameHostRuntime, IFrameProxyRuntime, ShellRuntime } from '@dxos/client-services';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { ThemeProvider } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { osTranslations, Shell } from '@dxos/react-shell';
import { createIFramePort, createWorkerPort } from '@dxos/rpc-tunnel';

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

export const startIFrameRuntime = async (createWorker: () => SharedWorker): Promise<void> => {
  // Handle reset path.
  const reset = window.location.hash === '#reset';
  if (reset) {
    return forceClientReset();
  }

  // Start iframe runtime.
  const shellDisabled = window.location.hash === '#disableshell';
  const config = new Config(await Dynamics(), Defaults());

  const appReady = new Trigger<string>();
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const { channel, payload } = event.data;
    if (channel !== DEFAULT_INTERNAL_CHANNEL) {
      return;
    }

    if (payload === 'init') {
      appReady.wake(event.origin);
    }
  });

  // TODO(wittjosiah): Remove mobile check once we can inspect shared workers in iOS Safari.
  if (mobileAndTabletCheck() || typeof SharedWorker === 'undefined') {
    console.log('Running DXOS vault in compatibility mode.');

    const origin = await appReady.wait();
    const messageChannel = new MessageChannel();
    window.parent.postMessage(
      {
        channel: DEFAULT_INTERNAL_CHANNEL,
        payload: {
          command: 'init',
          port: messageChannel.port1
        }
      },
      origin,
      [messageChannel.port1]
    );

    const iframeRuntime: IFrameHostRuntime = new IFrameHostRuntime({
      config,
      origin,
      appPort: createWorkerPort({ port: messageChannel.port2 }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' })
    });

    await iframeRuntime.start();
    if (iframeRuntime.shell) {
      await startShell(config, iframeRuntime.shell, iframeRuntime.services, iframeRuntime.origin);
    }

    window.addEventListener('beforeunload', () => {
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    const ports = new Trigger<{ systemPort: MessagePort; shellPort: MessagePort; appPort: MessagePort }>();
    createWorker().port.onmessage = (event) => {
      const { command, payload } = event.data;
      if (command === 'init') {
        ports.wake(payload);
      }
    };

    const { systemPort, shellPort, appPort } = await ports.wait();
    const origin = await appReady.wait();
    window.parent.postMessage(
      {
        channel: DEFAULT_INTERNAL_CHANNEL,
        payload: {
          command: 'init',
          port: appPort
        }
      },
      origin,
      [appPort]
    );

    let shellClientProxy: ClientServicesProvider | undefined;
    if (!shellDisabled) {
      shellClientProxy = new ClientServicesProxy(createWorkerPort({ port: shellPort }));
      void shellClientProxy.open();
    }

    const iframeRuntime: IFrameProxyRuntime = new IFrameProxyRuntime({
      config,
      systemPort: createWorkerPort({ port: systemPort }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' })
    });

    await iframeRuntime.open(origin);
    if (shellClientProxy && iframeRuntime.shell) {
      await startShell(config, iframeRuntime.shell, shellClientProxy, origin);
    }

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
