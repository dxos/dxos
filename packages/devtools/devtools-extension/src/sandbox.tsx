//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import debug from 'debug';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServices, ClientServicesProxy } from '@dxos/client-services';
import { DevtoolsContextProvider, Routes as DevtoolsRoutes } from '@dxos/devtools';
import { ClientContext, ClientContextProps } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';
import { RpcPort } from '@dxos/rpc';

// TODO(burdon): Use dxos/log?
const log = debug('dxos:extension:sandbox');

// TODO(burdon): Create class.
const clientReady = new Event<ClientContextProps>();

const windowPort = (): RpcPort => ({
  send: async (message) =>
    window.parent.postMessage({ data: Array.from(message), source: 'sandbox' }, window.location.origin),

  subscribe: (callback) => {
    const handler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (typeof message !== 'object' || message === null || message.source !== 'panel') {
        return;
      }

      log('Received message from panel:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

const waitForRpc = async () =>
  new Promise<void>((resolve) => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message !== 'object' || message === null || message.source !== 'panel') {
        return;
      }

      if (message.data === 'open-rpc') {
        log('Panel RPC port ready.');
        window.removeEventListener('message', handler);
        resolve();
      }
    };

    log('Sandbox RPC port ready.');
    window.addEventListener('message', handler);
    window.parent.postMessage({ data: 'open-rpc', source: 'sandbox' }, window.location.origin);
  });

const Devtools = ({ clientReady }: { clientReady: Event<ClientContextProps> }) => {
  const [value, setValue] = useState<ClientContextProps>();

  useEffect(() => {
    clientReady.on((value) => setValue(value));
  }, []);

  return (
    <ErrorBoundary>
      {value && (
        <ClientContext.Provider value={value}>
          <DevtoolsContextProvider>
            <HashRouter>
              <DevtoolsRoutes />
            </HashRouter>
          </DevtoolsContextProvider>
        </ClientContext.Provider>
      )}
    </ErrorBoundary>
  );
};

const init = async () => {
  // TODO(burdon): After client created.
  createRoot(document.getElementById('root')!).render(<Devtools clientReady={clientReady} />);

  log('initializing...');
  const rpcPort = windowPort();
  const servicesProvider = new ClientServicesProxy(rpcPort);
  await waitForRpc();

  const client = new Client({ services: servicesProvider });
  await client.initialize();

  log('initialized client');
  clientReady.emit({ client, services: servicesProvider.services as ClientServices });
};

void init();
