//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Client, Config, Defaults, Dynamics, Local } from '@dxos/client';
import { type ClientServicesProvider, ClientServicesProxy, type ShellRuntime } from '@dxos/client/services';
import { DEFAULT_INTERNAL_CHANNEL, DEFAULT_SHELL_CHANNEL } from '@dxos/client-protocol';
import type { IFrameHostRuntime } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { createIFramePort, createWorkerPort } from '@dxos/rpc-tunnel';
import { safariCheck } from '@dxos/util';

// const cssLogStyle = 'color:#C026D3;font-weight:bold';

const startShell = async (config: Config, runtime: ShellRuntime, services: ClientServicesProvider, origin: string) => {
  const { createElement, StrictMode } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { registerSignalFactory } = await import('@dxos/echo-signals/react');
  const { ThemeProvider, Tooltip } = await import('@dxos/react-ui');
  const { bindTheme, defaultTheme, dialogMotion, mx, surfaceElevation } = await import('@dxos/react-ui-theme');
  const { ClientContext } = await import('@dxos/react-client');
  const { osTranslations, Shell } = await import('@dxos/shell/react');

  const shellTx = bindTheme({
    ...defaultTheme,
    dialog: {
      ...defaultTheme.dialog,
      content: ({ inOverlayLayout, elevation = 'chrome' }, ...etc) =>
        mx(
          'flex flex-col',
          !inOverlayLayout && 'fixed z-20 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
          'is-[95vw] md:is-full max-is-[20rem] rounded-lg p-4',
          dialogMotion,
          surfaceElevation({ elevation }),
          'group-surface bg-neutral-75/95 dark:bg-neutral-850/95 backdrop-blur',
          ...etc,
        ),
    },
  });

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
        { tx: shellTx, resourceExtensions: [osTranslations] },
        createElement(Tooltip.Provider, {
          delayDuration: 100,
          skipDelayDuration: 400,
          children: createElement(
            // NOTE: Using context provider directly to avoid duplicate banners being logged.
            ClientContext.Provider,
            { value: { client } },
            createElement(Shell, { runtime, origin }),
          ),
        }),
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

  const info: string[] = [];

  if (safariCheck()) {
    log.info('Running DXOS shell from app client.');
    const origin = (window as any).__DXOS_APP_ORIGIN__;
    window.parent.postMessage({ channel: DEFAULT_INTERNAL_CHANNEL, payload: 'client' }, origin);
    const port = await appReady.wait();

    let shellClientProxy: ClientServicesProvider | undefined;
    if (!shellDisabled && port) {
      shellClientProxy = new ClientServicesProxy(createWorkerPort({ port }));
      void shellClientProxy.open(new Context());
    }

    if (shellClientProxy) {
      const { ShellRuntimeImpl } = await import('@dxos/client-services');
      const shellRuntime = new ShellRuntimeImpl(createIFramePort({ channel: 'dxos:shell' }));
      await shellRuntime.open();
      await startShell(config, shellRuntime, shellClientProxy, origin);
    }

    return;
  } else {
    // TODO(burdon): Remove hardcoded path.
    const isDev = window.location.href.includes('.dev.') || window.location.href.includes('localhost');
    const vaultUrl = `https://devtools${isDev ? '.dev.' : '.'}dxos.org/?target=${window.location.href}`;
    info.push(`%cOpen devtools: ${vaultUrl}`);
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
      await startShell(
        config,
        iframeRuntime.shell,
        // There's a TODO inside iframe runtime to address this but it's now deprecated.
        // This fixes the build so that we can move forward.
        iframeRuntime.services as unknown as ClientServicesProvider,
        iframeRuntime.origin,
      );
    }

    window.addEventListener('beforeunload', () => {
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    // info.push(`%cDXOS vault (shared worker) connection: ${window.location.origin}`);
    info.push('%cTo inspect/reset the vault (shared worker) copy the URL: chrome://inspect/#workers');
    const ports = new Trigger<{ systemPort: MessagePort; shellPort: MessagePort; appPort: MessagePort }>();
    const worker = createWorker();
    worker.onerror = (event) => {
      log.error('worker error', { event });
    };
    worker.port.onmessage = (event) => {
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
      void shellClientProxy.open(new Context());
    }

    const { SharedWorkerConnection } = await import('@dxos/client-services');
    const iframeRuntime = new SharedWorkerConnection({
      config,
      systemPort: createWorkerPort({ port: systemPort }),
      shellPort: shellDisabled ? undefined : createIFramePort({ channel: DEFAULT_SHELL_CHANNEL }),
    });

    await iframeRuntime.open(origin);
    if (shellClientProxy && iframeRuntime.shell) {
      await startShell(config, iframeRuntime.shell, shellClientProxy, origin);
    }

    // info.forEach((message) => log.info(message, cssLogStyle));

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
  const element = document.getElementById('vault-reset-success');
  element?.classList?.remove('hidden');
};
