//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DevtoolsApp } from '@dxos/devtools';
import { log } from '@dxos/log';
import { ClientServicesProxy } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type RpcPort } from '@dxos/rpc';

// NOTE: Sandbox runs in an iframe which is sandboxed from the web extension.
//  As such, it cannot import any modules which import from the web extension polyfill.
//  If it does, it will fail to start up with the error: "This script should only be loaded in a browser extension."

// log.config({ filter: 'debug' });
log('Init Sandbox script.');

const namespace = 'devtools-extension';

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
  },
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
  const [services, setServices] = useState<ClientServicesProxy>();

  useAsyncEffect(async () => {
    log('waiting for rpc...');
    await waitForRpc();
    const rpcPort = windowPort();
    const servicesProvider = new ClientServicesProxy(rpcPort);
    setServices(servicesProvider);
  }, []);

  if (!services) {
    return null;
  }

  return <DevtoolsApp services={services} />;
};

const init = () => createRoot(document.getElementById('root')!).render(<App />);

init();
