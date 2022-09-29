//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:iframe-port');

const sendToIFrame = (iframe: HTMLIFrameElement, origin: string, message: MessageData) => {
  if (!iframe.contentWindow) {
    log('IFrame content window missing', { origin });
    return;
  }

  // TODO(dmaretskyi): Determine if we need to strictly specify the target origin here.
  iframe.contentWindow.postMessage(message, '*', [message.payload]);
};

const sendToParentWindow = (origin: string, message: MessageData) => {
  window.parent.postMessage(message, origin, [message.payload]);
};

export type IFramePortOptions = {
  origin: string
  iframe?: HTMLIFrameElement
  source?: string
  destination?: string
}

/**
 * Create a RPC port with an iframe over window messaging.
 * @param options.origin Origin of destination window.
 * @param options.iframe Instance of the iframe if sending to child.
 * @param options.source Identifier for sent messages.
 * @param options.destination Listen for recieved messages with this source.
 * @returns RPC port for messaging.
 */
export const createIFramePort = ({
  origin,
  iframe,
  source: maybeSource,
  destination: maybeDestination
}: IFramePortOptions): RpcPort => {
  const source = maybeSource ?? (iframe ? 'parent' : 'child');
  const destination = maybeDestination ?? (iframe ? 'child' : 'parent');

  return {
    send: async data => {
      const payload = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const message = { source, payload };
      if (iframe) {
        sendToIFrame(iframe, origin, message);
      } else {
        sendToParentWindow(origin, message);
      }
    },
    subscribe: callback => {
      const handler = (event: MessageEvent<MessageData>) => {
        const message = event.data;
        if (message.source !== destination) {
          return;
        }

        log(`Received message from ${destination}:`, message);
        callback(new Uint8Array(message.payload));
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  };
};

/**
 * Create a hidden iframe and insert it into the DOM.
 * If an element with the same id already exists it will be returned instead.
 * @param source Source of the iframe.
 * @param id DOM id of the iframe.
 * @returns The created iframe.
 */
export const createIFrame = (source: string, id: string) => {
  const create = () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = id;
    iframe.src = source;
    iframe.setAttribute('style', 'display: none;');
    document.body.appendChild(iframe);
    return iframe;
  };

  return document.getElementById(id) as HTMLIFrameElement ?? create();
};
