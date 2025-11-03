//
// Copyright 2022 DXOS.org
//

import UAParser from 'ua-parser-js';

import { log } from '@dxos/log';
import { type RpcPort } from '@dxos/rpc';

import { type MessageData } from '../message';

let browser: string | undefined;
let os: string | undefined;

if (typeof navigator !== 'undefined') {
  // TODO(wittjosiah): Stop user agent parsing.
  const parser = new UAParser(navigator.userAgent);
  browser = parser.getBrowser().name;
  os = parser.getOS().name;
}

const sendToIFrame = (iframe: HTMLIFrameElement, origin: string, message: MessageData) => {
  if (!iframe.contentWindow) {
    log('IFrame content window missing', { origin });
    return;
  }

  if (browser === 'Chrome' && os === 'iOS') {
    iframe.contentWindow.postMessage(message, origin);
  } else {
    iframe.contentWindow.postMessage(message, origin, [message.payload]);
  }
};

const sendToParentWindow = (origin: string, message: MessageData) => {
  if (browser === 'Chrome' && os === 'iOS') {
    window.parent.postMessage(message, origin);
  } else {
    window.parent.postMessage(message, origin, [message.payload]);
  }
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
export const createIFramePort = ({ channel, iframe, origin, onOrigin }: IFramePortOptions): RpcPort => ({
  send: async (data) => {
    if (!origin) {
      log('no origin set', { channel });
      return;
    }

    log('sending', { channel, data: data.length });
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

      log('received', message);
      callback(new Uint8Array(message.payload));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  },
});

export type CreateIFrameOptions = {
  hidden?: boolean;
  allow?: string;
};

/**
 * Create a hidden iframe and insert it into the DOM.
 * If an element with the same id already exists it will be returned instead.
 * @param source Source of the iframe.
 * @param id DOM id of the iframe.
 * @returns The created iframe.
 */
export const createIFrame = (source: string, id: string, { hidden = true, allow }: CreateIFrameOptions = {}) => {
  const create = () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = id;
    iframe.src = source;
    hidden && iframe.setAttribute('style', 'display: none;');
    allow && iframe.setAttribute('allow', allow);
    document.body.appendChild(iframe);
    return iframe;
  };

  return (document.getElementById(id) as HTMLIFrameElement) ?? create();
};
