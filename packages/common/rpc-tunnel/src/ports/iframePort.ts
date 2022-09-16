//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:iframe-port');

/**
 * Create a RPC port into an iframe.
 * @param iframe Instance of the iframe.
 * @param origin Origin of the iframe to send messages to.
 * @returns RPC port for messaging.
 */
export const createIframeParentPort = (iframe: HTMLIFrameElement, origin: string): RpcPort => ({
  send: async message => {
    if (!iframe.contentWindow) {
      log('Iframe content window missing');
      return;
    }

    // Based on https://stackoverflow.com/a/54646864/2804332.
    const payload = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
    iframe.contentWindow.postMessage(
      {
        source: 'parent',
        payload
      },
      origin,
      [payload]
    );
  },
  subscribe: callback => {
    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.source !== 'child') {
        return;
      }

      log('Received message from child:', message);
      callback(new Uint8Array(message.payload));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

/**
 * Create a RPC port from an iframe to its parent.
 * @param origin Origin of the parent to send messages to.
 * @returns RPC port for messaging.
 */
export const createIframePort = (origin: string): RpcPort => ({
  send: async message => {
    const payload = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
    window.parent.postMessage(
      {
        source: 'child',
        payload
      },
      origin,
      [payload]
    );
  },
  subscribe: callback => {
    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.source !== 'parent') {
        return;
      }

      log('Recieved message from parent:', message);
      callback(new Uint8Array(message.payload));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});
