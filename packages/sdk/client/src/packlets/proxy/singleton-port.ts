//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';
import { isNode } from '@dxos/util';

const log = debug('dxos:client:singleton-port');

// TODO(wittjosiah): Protobuf for boundary?
export enum SingletonMessage {
  INITIALIZE_CHANNEL = 'INITIALIZE_CHANNEL',
  CHANNEL_READY = 'CHANNEL_READY',
  SETUP_CLIENT = 'SETUP_CLIENT',
  CLIENT_READY = 'CLIENT_READY',
  CLIENT_CLOSING = 'CLIENT_CLOSING',
  SETUP_PORT = 'SETUP_PORT',
  PORT_READY = 'PORT_READY',
  CLIENT_MESSAGE = 'CLIENT_MESSAGE',
  APP_MESSAGE = 'APP_MESSAGE'
}

const waitForClient = () => {
  return new Promise<void>(resolve => {
    const messageHandler = (event: MessageEvent<any>) => {
      if (event.data?.type === SingletonMessage.CLIENT_READY) {
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
      data: Array.from(message),
      type: SingletonMessage.APP_MESSAGE
    }, '*'),
    subscribe: callback => {
      const handler = (event: MessageEvent<any>) => {
        const message = event.data;
        if (
          typeof message !== 'object' ||
            message === null ||
            message.type !== SingletonMessage.CLIENT_MESSAGE
        ) {
          return;
        }

        log('Received message from singleton client:', message);
        callback(new Uint8Array(message.data));
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  };
};
