//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:iframe-port');

// TODO(wittjosiah): Is this unsecure? Does not seem to work without *.
const ORIGIN = '*';

export const createIframeParentPort = (iframe: HTMLIFrameElement): RpcPort => ({
  send: async message => {
    if (!iframe.contentWindow) {
      log('Iframe content window missing');
      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: 'parent',
        data: message
      },
      ORIGIN,
      [message]
    );
  },
  subscribe: callback => {
    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.type !== 'child') {
        return;
      }

      log('Received message from child:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

export const createIframePort = (): RpcPort => ({
  send: async message => {
    window.parent.postMessage(
      {
        type: 'child',
        data: message
      },
      ORIGIN,
      [message]
    );
  },
  subscribe: callback => {
    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.type !== 'parent') {
        return;
      }

      log('Recieved message from parent:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});
