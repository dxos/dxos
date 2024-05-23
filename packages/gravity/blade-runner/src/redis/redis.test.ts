//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Redis, type RedisOptions } from 'ioredis';

import { type Message, cbor, type PeerId } from '@dxos/automerge/automerge-repo';
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
describe.skip('Redis', () => {
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
    const { readStream: streamAlice, writeStream: streamBob } = await createLinkedReadWriteStreams();

    const reader = streamAlice.getReader();
    const receivedMessage = reader.read();

    const data = { info: 'hello', data: new Uint8Array([1, 2, 3]) };
    await streamBob.getWriter().write(data);
    expect((await receivedMessage).value).to.deep.eq(data);
  });

  test('echo connection', async () => {
    const [aliceConnection, bobConnection] = await createLinkedTestEchoConnections();

    const checkConnection = async (
      reader: ReadableStreamDefaultReader<Message>,
      writer: WritableStreamDefaultWriter<Message>,
    ) => {
      const receivedMessage = reader.read();

      const data = {
        type: 'sync',
        senderId: 'sender' as PeerId,
        targetId: 'receiver' as PeerId,
        data: new Uint8Array([1, 2, 3]),
      };
      await writer.write(data);
      expect((await receivedMessage).value).to.deep.eq(data);
    };

    {
      await checkConnection(aliceConnection.readable.getReader(), bobConnection.writable.getWriter());
    }
    {
      await checkConnection(bobConnection.readable.getReader(), aliceConnection.writable.getWriter());
    }
  });

  test('echo replication through Redis', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();

    const aliceReplicator: TestReplicator = new TestReplicator({
      onConnect: async () => {},
      onDisconnect: async () => {},
    });

    let aliceConnection: TestReplicatorConnection | undefined;
    let bobConnection: TestReplicatorConnection | undefined;
    const bobReplicator: TestReplicator = new TestReplicator({
      onConnect: async () => {
        [aliceConnection, bobConnection] = await createLinkedTestEchoConnections(
          bobReplicator.context!.peerId,
          aliceReplicator.context!.peerId,
        );
        aliceReplicator.context!.onConnectionOpen(aliceConnection);
        bobReplicator.context!.onConnectionOpen(bobConnection);
      },
      onDisconnect: async () => {
        aliceReplicator.context!.onConnectionClosed(aliceConnection!);
        bobReplicator.context!.onConnectionClosed(bobConnection!);
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
  let unsubscribed = false;
  afterTest(() => {
    unsubscribed = true;
  });

  const readStream = new ReadableStream({
    start: (controller) => {
      queueMicrotask(async () => {
        try {
          // eslint-disable-next-line no-unmodified-loop-condition
          while (!unsubscribed) {
            const message = await readClient.blpopBuffer(queue, 0);

            if (!message) {
              continue;
            }
            controller.enqueue(cbor.decode(message[1]));
          }
        } catch (err) {
          if (!unsubscribed) {
            log.catch(err);
          }
        }
      });
    },
    cancel: () => {
      unsubscribed = true;
    },
  });

  const writeStream = new WritableStream({
    start: () => {},
    write: async (chunk) => {
      await writeClient.rpush(queue, cbor.encode(chunk));
    },
  });

  return { readStream, writeStream };
};

const createLinkedTestEchoConnections = async (
  connection1Peer = 'alice-' + PublicKey.random().toHex(),
  connection2Peer = 'bob-' + PublicKey.random().toHex(),
) => {
  const { readStream: aliceReadable, writeStream: bobWritable } = await createLinkedReadWriteStreams();
  const { readStream: bobReadable, writeStream: aliceWritable } = await createLinkedReadWriteStreams();
  const aliceConnection = new TestReplicatorConnection(connection1Peer, aliceReadable, aliceWritable);
  const bobConnection = new TestReplicatorConnection(connection2Peer, bobReadable, bobWritable);
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
