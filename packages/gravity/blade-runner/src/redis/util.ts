//
// Copyright 2024 DXOS.org
//

import type Redis from 'ioredis';

import { cbor } from '@dxos/automerge/automerge-repo';
import { type Any } from '@dxos/codec-protobuf';
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
    subscribe: (callback: (message: Uint8Array) => void) =>
      subscribeToRedisQueue({ client: receiveClient, queue: receiveQueue, callback }),
  };
};

export const createRedisReadableStream = ({ client, queue }: { client: Redis; queue: string }) => {
  let unsubscribe: () => void;

  const readStream = new ReadableStream({
    start: (controller) => {
      unsubscribe = subscribeToRedisQueue({
        client,
        queue,
        callback: (message) => controller.enqueue(cbor.decode(message)),
      });
    },
    cancel: () => {
      log.info('RedisReadableStream: cancel');
      unsubscribe?.();
    },
  });

  return readStream;
};

export const createRedisWritableStream = ({ client, queue }: { client: Redis; queue: string }) => {
  const writeStream = new WritableStream({
    write: async (message) => {
      await client.rpush(queue, cbor.encode(message));
    },
  });

  return writeStream;
};

export const subscribeToRedisQueue = ({
  client,
  queue,
  callback,
}: {
  client: Redis;
  queue: string;
  callback: (message: Uint8Array) => void;
}): (() => void) => {
  let unsubscribed = false;
  queueMicrotask(async () => {
    try {
      // eslint-disable-next-line no-unmodified-loop-condition
      while (!unsubscribed) {
        const message = await client.blpopBuffer(queue, 0);

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
};

export const rpcCodec = {
  encode: (value: any): Any => ({
    type_url: 'google.protobuf.Any',
    value: Buffer.from(JSON.stringify(value ?? [undefined])),
  }),
  decode: (value: Any): any => JSON.parse(Buffer.from(value.value).toString()),
};
