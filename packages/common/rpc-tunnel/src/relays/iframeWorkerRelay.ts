//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:iframe-worker-relay');

export const createIframeWorkerRelay = (origin: string, messagePort: MessagePort) => {
  const windowHandler = (event: MessageEvent<MessageData>) => {
    const message = event.data;
    log('Forwarding message from window:', message);
    messagePort.postMessage(message);
  };

  return {
    start: () => {
      window.addEventListener('message', windowHandler);
      messagePort.onmessage = (event: MessageEvent<MessageData>) => {
        const message = event.data;
        log('Forwarding message from worker:', message);
        window.parent.postMessage(message, origin);
      };
    },
    stop: () => {
      window.removeEventListener('message', windowHandler);
      messagePort.onmessage = null;
    }
  };
};
