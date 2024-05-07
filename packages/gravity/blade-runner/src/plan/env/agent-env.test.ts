//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Redis, type RedisOptions } from 'ioredis';

import { type TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type TYPES } from '@dxos/protocols';
import { RpcPeer, type RpcPort } from '@dxos/rpc';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { REDIS_PORT } from './agent-env';

/**
 * NOTE(mykola): This test is disabled because it requires a running Redis server.
 *               `redis-server --port 6378` to start a Redis server on port 6378.
 * TODO(mykola): Mock Redis server.
 */
describe.skip('AgentEnv', () => {
  describe('Redis', () => {
    test('two redis client can exchange messages', async () => {
      const client = await setupRedisClient();
      const server = await setupRedisClient();

      const key = 'message-' + PublicKey.random().toHex();
      const value = 'hello';
      const message = server.blpop(key, 0);

      await client.rpush(key, value);

      expect(await message).to.deep.equal([key, value]);
    });

    test('RPC connection between two redis clients', async () => {
      const [alicePort, bobPort] = await createLinkedRedisPorts();

      const alice = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).to.eq('method');
          expect(msg.value).to.deep.eq(Buffer.from('request'));
          return createPayload('response');
        },
        port: alicePort,
        noHandshake: true,
      });
      const bob = new RpcPeer({
        callHandler: async (method, msg) => createPayload(),
        port: bobPort,
        noHandshake: true,
      });

      await openAndClose(alice, bob);

      const response = await bob.call('method', createPayload('request'));
      expect(response).to.deep.eq(createPayload('response'));
    });
  });
});

const createLinkedRedisPorts = async () => {
  const aliceQueue = 'alice-' + PublicKey.random().toHex();
  const bobQueue = 'bob-' + PublicKey.random().toHex();

  const alicePort = await createRedisRpcPort({
    sendClient: await setupRedisClient(),
    receiveClient: await setupRedisClient(),
    sendQueue: bobQueue,
    receiveQueue: aliceQueue,
  });

  const bobPort = await createRedisRpcPort({
    sendClient: await setupRedisClient(),
    receiveClient: await setupRedisClient(),
    sendQueue: aliceQueue,
    receiveQueue: bobQueue,
  });
  return [alicePort, bobPort];
};

const createRedisRpcPort = async ({
  sendClient,
  receiveClient,
  sendQueue,
  receiveQueue,
}: {
  sendClient: Redis;
  receiveClient: Redis;
  sendQueue: string;
  receiveQueue: string;
}): Promise<RpcPort> => {
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

const setupRedisClient = async () => {
  const redis = new Redis({ port: REDIS_PORT } as RedisOptions);
  afterTest(() => redis.disconnect());
  return redis;
};
const createPayload = (value = ''): TaggedType<TYPES, 'google.protobuf.Any'> => ({
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.test',
  value: Buffer.from(value),
});
