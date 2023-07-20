//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Client, Config, Defaults, Dynamics, Local } from '@dxos/client';
import { DEFAULT_INTERNAL_CHANNEL } from '@dxos/client-protocol';
import type { IFrameHostRuntime, IFrameProxyRuntime } from '@dxos/client-services';
import { ClientServicesProvider, ClientServicesProxy, ShellRuntime } from '@dxos/client/services';
import { log } from '@dxos/log';
import { createIFramePort, createWorkerPort } from '@dxos/rpc-tunnel';
import { safariCheck } from '@dxos/util';

const cssStyle = 'color:#C026D3;font-weight:bold';

const startShell = async (config: Config, runtime: ShellRuntime, services: ClientServicesProvider, origin: string) => {
  const { createElement, StrictMode } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { registerSignalFactory } = await import('@dxos/echo-signals/react');
  const { ThemeProvider } = await import('@dxos/react-appkit');
  const { ClientContext } = await import('@dxos/react-client');
  const { osTranslations, Shell } = await import('@dxos/react-shell');

  registerSignalFactory();
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
        createElement(ClientContext.Provider, { value: { client } }, createElement(Shell, { runtime, origin })),
      ),
    ),
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
  const config = new Config(await Dynamics(), Local(), Defaults());

  const appReady = new Trigger<MessagePort | undefined>();
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const { channel, payload } = event.data;
    if (channel !== DEFAULT_INTERNAL_CHANNEL) {
      return;
    }

    if (payload.command === 'port') {
      appReady.wake(payload.port);
    }
  });

  if (safariCheck()) {
    log.info('Running DXOS shell from app client.');
    const origin = (window as any).__DXOS_APP_ORIGIN__;
    window.parent.postMessage({ channel: DEFAULT_INTERNAL_CHANNEL, payload: 'client' }, origin);
    const port = await appReady.wait();

    let shellClientProxy: ClientServicesProvider | undefined;
    if (!shellDisabled && port) {
      shellClientProxy = new ClientServicesProxy(createWorkerPort({ port }));
      void shellClientProxy.open();
    }

    if (shellClientProxy) {
      const { ShellRuntimeImpl } = await import('@dxos/client-services');
      const shellRuntime = new ShellRuntimeImpl(createIFramePort({ channel: 'dxos:shell' }));
      await shellRuntime.open();
      await startShell(config, shellRuntime, shellClientProxy, origin);
    }

    return;
  } else {
    const isDev = window.location.href.includes('.dev.') || window.location.href.includes('localhost');

    console.log(
      `%cTo inspect this application, click here:\nhttps://devtools${isDev ? '.dev.' : '.'}dxos.org/?target=vault:${
        window.location.href
      }`,
      cssStyle,
    );
  }

  if (typeof SharedWorker === 'undefined') {
    log.info('Running DXOS vault in main process.');

    const messageChannel = new MessageChannel();
    const origin = (window as any).__DXOS_APP_ORIGIN__;
    window.parent.postMessage(
      {
        channel: DEFAULT_INTERNAL_CHANNEL,
        payload: {
          command: 'init',
          port: messageChannel.port1,
        },
      },
      origin,
      [messageChannel.port1],
    );

    const { IFrameHostRuntime } = await import('@dxos/client-services');
    const iframeRuntime: IFrameHostRuntime = new IFrameHostRuntime({
      config,
      origin,
      appPort: createWorkerPort({ port: messageChannel.port2 }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' }),
    });

    await iframeRuntime.start();
    if (iframeRuntime.shell) {
      await startShell(config, iframeRuntime.shell, iframeRuntime.services, iframeRuntime.origin);
    }

    window.addEventListener('beforeunload', () => {
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    console.log(
      `%cDXOS Client is communicating with the shared worker on ${window.location.origin}.\nInspect the worker using: chrome://inspect/#workers (URL must be copied manually).`,
      cssStyle,
    );
    const ports = new Trigger<{ systemPort: MessagePort; shellPort: MessagePort; appPort: MessagePort }>();
    createWorker().port.onmessage = (event) => {
      const { command, payload } = event.data;
      if (command === 'init') {
        ports.wake(payload);
      }
    };

    const { systemPort, shellPort, appPort } = await ports.wait();
    const origin = (window as any).__DXOS_APP_ORIGIN__;
    window.parent.postMessage(
      {
        channel: DEFAULT_INTERNAL_CHANNEL,
        payload: {
          command: 'init',
          port: appPort,
        },
      },
      origin,
      [appPort],
    );

    let shellClientProxy: ClientServicesProvider | undefined;
    if (!shellDisabled) {
      shellClientProxy = new ClientServicesProxy(createWorkerPort({ port: shellPort }));
      void shellClientProxy.open();
    }

    const { IFrameProxyRuntime } = await import('@dxos/client-services');
    const iframeRuntime: IFrameProxyRuntime = new IFrameProxyRuntime({
      config,
      systemPort: createWorkerPort({ port: systemPort }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: 'dxos:shell' }),
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

  const { ClientServicesHost } = await import('@dxos/client-services');
  const services = new ClientServicesHost({ config });
  await services.reset();

  // TODO(wittjosiah): Make this look nicer.
  const message = document.createElement('div');
  message.textContent = 'Client storage has been reset. Return to the app and reload.';
  document.body.appendChild(message);
};
