//
// Copyright 2024 DXOS.org
//

import type Redis from 'ioredis';

import { log } from '@dxos/log';
import { type RpcPort } from '@dxos/rpc';

export const createRedisRpcPort = ({
  sendClient,
  receiveClient,
  sendQueue,
  receiveQueue,
}: {
  sendClient: Redis;
  receiveClient: Redis;
  sendQueue: string;
  receiveQueue: string;
}): RpcPort => {
  return {
    send: async (message: Uint8Array) => {
      await sendClient.rpush(sendQueue, Buffer.from(message));
    },
    subscribe: (callback: (message: Uint8Array) => void) => {
      let unsubscribed = false;
      queueMicrotask(async () => {
        try {
          // eslint-disable-next-line no-unmodified-loop-condition
          while (!unsubscribed) {
            const message = await receiveClient.blpopBuffer(receiveQueue, 0);
            if (!message) {
              continue;
            }
            callback(message[1]);
          }
        } catch (err) {
          if (!unsubscribed) {
            log.catch(err);
          }
        }
      });
      return () => {
        unsubscribed = true;
      };
    },
  };
};
