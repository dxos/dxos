//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';
import { isNode } from '@dxos/util';

const log = debug('dxos:client:singleton-port');

export const createSingletonPort = (singletonSource: string): RpcPort => {
  if (isNode()) {
    throw new Error('Connecting to singleton client is not available in Node environment.');
  }

  const singleton = document.createElement('iframe') as HTMLIFrameElement;
  singleton.id = 'dxos-client-singleton';
  singleton.src = singletonSource;
  singleton.setAttribute('style', 'display: none;');
  document.body.appendChild(singleton);

  return {
    send: async message => singleton.contentWindow?.postMessage({
      data: Array.from(message),
      source: 'app'
    }, '*'),
    subscribe: callback => {
      const handler = (event: MessageEvent<any>) => {
        const message = event.data;
        if (
          typeof message !== 'object' ||
            message === null ||
            message.source !== 'client'
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
