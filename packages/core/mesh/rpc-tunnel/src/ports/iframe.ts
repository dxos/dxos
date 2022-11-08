//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const sendToIFrame = (iframe: HTMLIFrameElement, origin: string, message: MessageData) => {
  if (!iframe.contentWindow) {
    log.debug('IFrame content window missing', { origin });
    return;
  }

  // TODO(dmaretskyi): Determine if we need to strictly specify the target origin here.
  iframe.contentWindow.postMessage(message, '*', [message.payload]);
};

const sendToParentWindow = (origin: string, message: MessageData) => {
  window.parent.postMessage(message, origin, [message.payload]);
};

export type IFramePortOptions = {
  channel: string;
  iframe?: HTMLIFrameElement;
  origin?: string;
  onOrigin?: (origin: string) => void;
};

/**
 * Create a RPC port with an iframe over window messaging.
 * @param options.channel Identifier for sent/recieved messages.
 * @param options.iframe Instance of the iframe if sending to child.
 * @param options.origin Origin of the destination window.
 * @param options.onOrigin Callback triggered when origin of destination window is verified.
 * @returns RPC port for messaging.
 */
export const createIFramePort = ({ channel, iframe, origin, onOrigin }: IFramePortOptions): RpcPort => {
  return {
    send: async (data) => {
      if (!origin) {
        log.warn('No origin set yet', { channel });
        return;
      }

      const payload = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const message = { channel, payload };
      if (iframe) {
        sendToIFrame(iframe, origin, message);
      } else {
        sendToParentWindow(origin, message);
      }
    },
    subscribe: (callback) => {
      const handler = (event: MessageEvent<unknown>) => {
        if (!iframe && event.source !== window.parent) {
          // Not from parent window.
          return;
        } else if (iframe && event.source !== iframe.contentWindow) {
          // Not from child window.
          return;
        }

        const isMessageData =
          event.data && typeof event.data === 'object' && 'channel' in event.data && 'payload' in event.data;
        const message = isMessageData ? (event.data as MessageData) : undefined;
        if (message?.channel !== channel) {
          return;
        }

        if (!origin) {
          origin = event.origin;
          onOrigin?.(origin);
        }

        log.debug('Received message', message);
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

  return (document.getElementById(id) as HTMLIFrameElement) ?? create();
};

/**
 * Removes a hidden iframe created by createIFrame() function.
 * If an element with the id does not exists it will do nothing.
 * @param id DOM id of the iframe.
 */
export const removeIFrame = (id: string) => {
  const iframe = document.getElementById(id) as HTMLIFrameElement;
  if (iframe) {
    document.body.removeChild(iframe);
  }
};
