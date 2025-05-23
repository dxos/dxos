//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { type RpcPort } from '@dxos/rpc';

import { type MessageData } from '../message';

export type WorkerPortOptions = {
  port: MessagePort;
  channel?: string;
  subscribe?: RpcPort['subscribe'];
};

/**
 * Create a RPC port for a worker.
 * @param options.port Message port to send message on.
 * @param options.channel Identifier for sent/recieved messages.
 * @param options.subscribe
 * @returns RPC port for messaging.
 */
// TODO(wittjosiah): Rename for more general purpose MessagePort.
export const createWorkerPort = ({ port, channel, subscribe }: WorkerPortOptions): RpcPort => ({
  send: async (message) => {
    // Based on https://stackoverflow.com/a/54646864/2804332.
    const payload = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
    port.postMessage(
      {
        channel,
        payload,
      },
      [payload],
    );
  },

  subscribe:
    subscribe ??
    ((callback) => {
      const handler = (event: MessageEvent<MessageData>) => {
        const message = event.data;
        if (channel && message.channel !== channel) {
          return;
        }

        log.debug('received', { message });
        callback(new Uint8Array(message.payload));
      };

      port.onmessage = handler;
      return () => {
        port.onmessage = null;
      };
    }),
});
