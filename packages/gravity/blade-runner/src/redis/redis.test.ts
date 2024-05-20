//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Redis, type RedisOptions } from 'ioredis';

import { type TaggedType } from '@dxos/codec-protobuf';
import { EchoTestBuilder, TestReplicator, TestReplicatorConnection, createDataAssertion } from '@dxos/echo-db/testing';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type TYPES } from '@dxos/protocols';
import { RpcPeer } from '@dxos/rpc';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { REDIS_PORT, createRedisRpcPort } from './util';

/**
 * NOTE(mykola): This test is disabled because it requires a running Redis server.
 *               `redis-server --port 6378` to start a Redis server on port 6378.
 * TODO(mykola): Mock Redis server.
 */
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

  test('pass web-stream through Redis', async () => {
    const [alicePort, bobPort] = await createLinkedRedisPorts();

    const streamAlice = new ReadableStream({
      start: (controller) => {
        const unsub = alicePort.subscribe((chunk) => {
          controller.enqueue(chunk);
        });
        afterTest(() => unsub?.());
      },
    });

    const reader = streamAlice.getReader();
    const receivedChunk = reader.read();

    const data = Buffer.from('hello');
    await bobPort.send(data);
    expect((await receivedChunk).value).to.deep.eq(data);
  });

  test.only('echo replication through Redis', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const dataAssertion = createDataAssertion();
    const [spaceKey] = PublicKey.randomSequence();

    const [aliceConnection, bobConnection] = await createLinkedTestEchoConnections();
    const aliceReplicator: TestReplicator = new TestReplicator({
      onConnect: async () => aliceReplicator.context?.onConnectionOpen(aliceConnection),
      onDisconnect: async () => {
        aliceReplicator.context?.onConnectionClosed(aliceConnection);
        await bobReplicator.removeConnection(bobConnection);
      },
    });

    const bobReplicator: TestReplicator = new TestReplicator({
      onConnect: async () => bobReplicator.context?.onConnectionOpen(bobConnection),
      onDisconnect: async () => {
        bobReplicator.context?.onConnectionClosed(bobConnection);
        await aliceReplicator.removeConnection(aliceConnection);
      },
    });

    await using alice = await builder.createPeer();
    await using bob = await builder.createPeer();
    await alice.host.addReplicator(aliceReplicator);
    await bob.host.addReplicator(bobReplicator);

    await using db1 = await alice.createDatabase(spaceKey);
    await dataAssertion.seed(db1);

    await using db2 = await bob.openDatabase(spaceKey, db1.rootUrl!);
    await dataAssertion.verify(db2);
  });
});

const createLinkedRedisPorts = async () => {
  const alice = 'alice-' + PublicKey.random().toHex();
  const bob = 'bob-' + PublicKey.random().toHex();

  const alicePort = createRedisRpcPort({
    sendClient: await setupRedisClient(),
    receiveClient: await setupRedisClient(),
    sendQueue: bob,
    receiveQueue: alice,
  });

  const bobPort = createRedisRpcPort({
    sendClient: await setupRedisClient(),
    receiveClient: await setupRedisClient(),
    sendQueue: alice,
    receiveQueue: bob,
  });
  return [alicePort, bobPort];
};

const createLinkedReadWriteStreams = async () => {
  const queue = 'stream-queue' + PublicKey.random().toHex();
  const readClient = await setupRedisClient();
  const writeClient = await setupRedisClient();

  const readStream = new ReadableStream({
    start: (controller) => {
      let unsubscribed = false;
      afterTest(() => (unsubscribed = true));
      queueMicrotask(async () => {
        try {
          // eslint-disable-next-line no-unmodified-loop-condition
          while (!unsubscribed) {
            const message = await readClient.blpopBuffer(queue, 0);

            if (!message) {
              continue;
            }
            controller.enqueue(message[1]);
          }
        } catch (err) {
          if (!unsubscribed) {
            log.catch(err);
          }
        }
      });
    },
  });

  const writeStream = new WritableStream({
    write: async (chunk) => {
      await writeClient.rpush(queue, chunk);
    },
  });

  return { readStream, writeStream };
};

const createLinkedTestEchoConnections = async () => {
  const alice = 'alice-' + PublicKey.random().toHex();
  const bob = 'bob-' + PublicKey.random().toHex();

  const { readStream: aliceReadable, writeStream: bobWritable } = await createLinkedReadWriteStreams();
  const { readStream: bobReadable, writeStream: aliceWritable } = await createLinkedReadWriteStreams();
  const aliceConnection = new TestReplicatorConnection(alice, aliceReadable, aliceWritable);
  const bobConnection = new TestReplicatorConnection(bob, bobReadable, bobWritable);
  aliceConnection.otherSide = bobConnection;
  bobConnection.otherSide = aliceConnection;
  return [aliceConnection, bobConnection];
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
