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

// NOTE: Sandbox runs in an iframe which is sandboxed from the web extension.
//  As such, it cannot import any modules which import from the web extension polyfill.
//  If it does, it will fail to start up with the error: "This script should only be loaded in a browser extension."

// log.config({ filter: 'debug' });
log('Init Sandbox script.');

const namespace = 'devtools-extension';

// `ClientServicesProxy` speaks the effect-rpc native Worker protocol over a `MessagePort`, but the
// sandbox only has a `window.postMessage` channel to the panel. Relay one end of a `MessageChannel`
// over it: `window.postMessage` preserves structured-clone payloads, so protocol frames cross
// unencoded, keeping the `sandbox`/`panel` source tags the panel routes on.
// TODO(dxos): The host-side Worker-protocol bridge is a follow-up; until it lands this connection
//   carries no live traffic (see plans/worker-package/rpc-effect.md, Phase C).
const windowPort = (): MessagePort => {
  const channel = new MessageChannel();
  channel.port2.onmessage = (event) => {
    window.parent.postMessage({ message: event.data, source: 'sandbox' }, window.location.origin);
  };
  const handler = (event: MessageEvent<any>) => {
    const message = event.data;
    if (typeof message !== 'object' || message === null || message.source !== 'panel') {
      return;
    }
    log('Received message from panel:', message);
    channel.port2.postMessage(message.message);
  };
  window.addEventListener('message', handler);
  channel.port2.start();
  return channel.port1;
};

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
    const servicesProvider = new ClientServicesProxy(windowPort());
    setServices(servicesProvider);
  }, []);

  if (!services) {
    return null;
  }

  return <DevtoolsApp services={services} />;
};

const init = () => createRoot(document.getElementById('root')!).render(<App />);

init();
