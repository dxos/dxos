//
// Copyright 2024 DXOS.org
//

import type Redis from 'ioredis';

import { type Any } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { type RpcPort } from '@dxos/rpc';

export const REDIS_PORT = 6379;

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

export const rpcCodec = {
  encode: (value: any): Any => ({
    type_url: 'google.protobuf.Any',
    value: Buffer.from(JSON.stringify(value ?? [undefined])),
  }),
  decode: (value: Any): any => JSON.parse(Buffer.from(value.value).toString()),
};
