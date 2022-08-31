//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';
import { isNode } from '@dxos/util';

import { SingletonMessage } from '../proto';

const log = debug('dxos:client:singleton-port');

const IFRAME_ID = 'dxos-client-singleton';

const waitForClient = () => {
  return new Promise<void>(resolve => {
    const messageHandler = (event: MessageEvent<SingletonMessage>) => {
      if (event.data?.type === SingletonMessage.Type.PROVIDER_READY) {
        window.removeEventListener('message', messageHandler);
        resolve();
      }
    };

    window.addEventListener('message', messageHandler);
  });
};

const createIframe = (source: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement;
  iframe.id = IFRAME_ID;
  iframe.src = source;
  iframe.setAttribute('style', 'display: none;');
  document.body.appendChild(iframe);

  return iframe;
};

export const createSingletonPort = async (singletonSource: string): Promise<RpcPort> => {
  if (isNode()) {
    throw new Error('Connecting to singleton client is not available in Node environment.');
  }

  const singleton = document.getElementById(IFRAME_ID) as HTMLIFrameElement ??
    createIframe(singletonSource);

  await waitForClient();

  return {
    send: async message => singleton.contentWindow?.postMessage({
      type: SingletonMessage.Type.WINDOW_MESSAGE,
      data: Array.from(message)
    }, '*'),
    subscribe: callback => {
      const handler = (event: MessageEvent<SingletonMessage>) => {
        const message = event.data;
        if (message?.type !== SingletonMessage.Type.WINDOW_MESSAGE) {
          return;
        }

        log('Received message from singleton client:', message);
        callback(new Uint8Array(message.data!));
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  };
};
