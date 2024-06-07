//
// Copyright 2024 DXOS.org
//

import type Redis from 'ioredis';

import { scheduleMicroTask } from '@dxos/async';
import { cbor } from '@dxos/automerge/automerge-repo';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { type RpcPort } from '@dxos/rpc';

// TODO(mykola): createRpcPort(createRedisReadableStream(...), createRedisWritableStream(...))
//               Consider WebStreams to be the base primitive as they are the most flexible.
//               We can implement all low-level integration in terms of WebStreams and then derive things like RpcPort from them.
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
      client.disconnect();
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
  const ctx = new Context();
  scheduleMicroTask(ctx, async () => {
    while (!ctx.disposed) {
      const message = await client.blpopBuffer(queue, 0);
      if (!message) {
        continue;
      }
      callback(message[1]);
    }
  });
  return () => {
    void ctx.dispose();
  };
};

export const rpcCodec = {
  encode: (value: any): Any => ({
    type_url: 'google.protobuf.Any',
    value: Buffer.from(JSON.stringify(value ?? [undefined])),
  }),
  decode: (value: Any): any => JSON.parse(Buffer.from(value.value).toString()),
};
