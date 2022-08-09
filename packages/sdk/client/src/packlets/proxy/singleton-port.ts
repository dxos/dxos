//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';
import { isNode } from '@dxos/util';

import { SingletonMessage } from '../proto';

const log = debug('dxos:client:singleton-port');

const waitForClient = () => {
  return new Promise<void>(resolve => {
    const messageHandler = (event: MessageEvent<SingletonMessage>) => {
      if (event.data?.type === SingletonMessage.Type.CLIENT_READY) {
        window.removeEventListener('message', messageHandler);
        resolve();
      }
    };

    window.addEventListener('message', messageHandler);
  });
};

export const createSingletonPort = async (singletonSource: string): Promise<RpcPort> => {
  if (isNode()) {
    throw new Error('Connecting to singleton client is not available in Node environment.');
  }

  const singleton = document.createElement('iframe') as HTMLIFrameElement;
  singleton.id = 'dxos-client-singleton';
  singleton.src = singletonSource;
  singleton.setAttribute('style', 'display: none;');
  document.body.appendChild(singleton);

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
