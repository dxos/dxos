//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { Client, ClientServicesProxy } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';

/**
 * Creates Client with services opened on parent window.__DXOS__ hook.
 */
export const useProxiedClient = () => {
  const [client, setClient] = useState<Client>();
  useAsyncEffect(async () => {
    const client = await createClientProxy();
    setClient(client);
  }, []);

  return client;
};

const createClientProxy = async () => {
  // `ClientServicesProxy` speaks the effect-rpc native Worker protocol over a `MessagePort`, but the
  // extension only has a `window.postMessage` channel to the injected `window.__DXOS__` bridge. Relay
  // one end of a `MessageChannel` over it: `window.postMessage` preserves structured-clone payloads,
  // so protocol frames cross unencoded, keeping the `content-script`/`dxos-client` source tags the
  // bridge routes on.
  // TODO(dxos): The host-side Worker-protocol bridge is a follow-up; until it lands this connection
  //   carries no live traffic (see plans/worker-package/rpc-effect.md, Phase C).
  const channel = new MessageChannel();
  channel.port2.onmessage = (event) => {
    window.parent.postMessage({ source: 'content-script', message: event.data }, '*');
  };
  const handler = (event: MessageEvent<any>) => {
    const data = event.data;
    if (typeof data !== 'object' || data === null || data.source !== 'dxos-client') {
      return;
    }
    channel.port2.postMessage(data.message);
  };
  window.addEventListener('message', handler);
  channel.port2.start();

  const services = new ClientServicesProxy(channel.port1);
  const client = new Client({ services });
  await client.initialize();
  return client;
};
