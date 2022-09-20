//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { MessageData } from '../message';
import { MessageChannel } from '../ports';
import { MessageRelay } from './message-relay';

const log = debug('dxos:rpc-tunnel:iframe-worker-relay');

export type IFrameWorkerRelayOptions = {
  channel?: MessageChannel
  port: MessagePort
  origin: string
}

/**
 * Forwards messages to and from a worker inside an iframe.
 * @param options.channel Message channel of the worker to subscribe to.
 * @param options.port Message port to send message on.
 * @param options.origin Origin of destination window.
 * @returns Message relay.
 */
export const createIFrameWorkerRelay = ({ channel, port, origin }: IFrameWorkerRelayOptions): MessageRelay => {
  const windowHandler = (event: MessageEvent<MessageData>) => {
    const message = event.data;
    log('Forwarding message from window:', message);
    port.postMessage(message);
  };

  return {
    start: () => {
      window.addEventListener('message', windowHandler);
      if (channel) {
        channel.addHandler(origin, /.*/, message => window.parent.postMessage(message, origin));
      } else {
        port.onmessage = (event: MessageEvent<MessageData>) => {
          const message = event.data;
          log('Forwarding message from worker:', message);
          window.parent.postMessage(message, origin);
        };
      }
    },
    stop: () => {
      window.removeEventListener('message', windowHandler);
      if (channel) {
        channel.removeHandler(origin);
      } else {
        port.onmessage = null;
      }
    }
  };
};
