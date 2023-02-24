//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Client } from '@dxos/client';
import { ClientServicesProxy } from '@dxos/client-services';
import { Devtools } from '@dxos/devtools';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContextProps } from '@dxos/react-client';
import { RpcPort } from '@dxos/rpc';

log.config({ filter: 'debug' });
log('Init Sandbox script.');

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

const App = () => {
  log('initializing...');

  const [value, setValue] = useState<ClientContextProps>();

  useAsyncEffect(async () => {
    const rpcPort = windowPort();
    const servicesProvider = new ClientServicesProxy(rpcPort);
    await waitForRpc();

    const client = new Client({ services: servicesProvider });
    await client.initialize();
    log('initialized client');
    setValue({ client, services: servicesProvider.services });
  }, []);

  return <Devtools client={value} />;
};

const init = async () => {
  createRoot(document.getElementById('root')!).render(<App />);
};

void init();
