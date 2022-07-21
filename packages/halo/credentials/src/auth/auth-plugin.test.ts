//
// Copyright 2019 DXOS.org
//

// DXOS testing browser.

import assert from 'assert';
import debug from 'debug';
import eos from 'end-of-stream';
import expect from 'expect';
import pify from 'pify';
import pump from 'pump';
import waitForExpect from 'wait-for-expect';

import { randomBytes, createKeyPair } from '@dxos/crypto';
import { FeedStore, createBatchStream, HypercoreFeed } from '@dxos/feed-store';
import { Protocol, ProtocolOptions } from '@dxos/mesh-protocol';
import { Replicator } from '@dxos/protocol-plugin-replicator';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import { Keyring } from '../keys';
import { codec, codecLoop, KeyType, SignedMessage } from '../proto';
import { createAuthMessage } from './auth-message';
import { AuthPlugin } from './auth-plugin';
import { Authenticator } from './authenticator';

const log = debug('dxos:halo:auth:test');

const createTestKeyring = async () => {
  const keyring = new Keyring();
  await keyring.load();

  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await keyring.createKeyRecord({ type: KeyType[type as any] });
    }
  }

  return keyring;
};

/**
 * A test Authenticator that checks for the signature of a pre-determined key.
 */
class ExpectedKeyAuthenticator implements Authenticator {
  constructor (
    private _keyring: Keyring,
    private _expectedKey: PublicKey
  ) {}

  async authenticate (credentials: SignedMessage) {
    if (this._keyring.verify(credentials)) {
      if (this._expectedKey.equals(credentials.signatures![0].key)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Create and configure a Protocol object with all the necessary plugins for Auth and Replication.
 * There are a lot of steps to this. We need an Auth plugin, the credentials, and and an Authenticator to check them,
 * we need a Replicator and a Feed to replicate, and we need a Protocol to attach the plugins too.
 * Basically, we need all of data-client but in one fairly small function.
 * @listens AuthPlugin#authenticated
 */
const createProtocol = async (partyKey: PublicKey, authenticator: Authenticator, keyring: Keyring, protocolOptions?: ProtocolOptions) => {
  const identityKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
  const deviceKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  const peerId = deviceKey!.publicKey.asBuffer();
  const feedStore = new FeedStore(createStorage('', StorageType.RAM).directory('feed'), { valueEncoding: 'utf8' });
  const { publicKey, secretKey } = createKeyPair();
  const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
  const append = pify(feed.append.bind(feed));

  const credentials = Buffer.from(codec.encode(
    codecLoop(createAuthMessage(keyring, partyKey, identityKey!, deviceKey!))
  )).toString('base64');

  const auth = new AuthPlugin(peerId, authenticator, [Replicator.extension]);
  const authPromise = new Promise((resolve) => {
    auth.on('authenticated', (incomingPeerId) => {
      log(`Authenticated ${PublicKey.stringify(incomingPeerId)} on ${PublicKey.stringify(peerId)}`);
      resolve(true);
    });
  });

  // Share and replicate all known feeds.
  const repl = new Replicator({
    load: async () => [feed],

    subscribe: (add: (feed: any) => void) => feedStore.feedOpenedEvent.on((descriptor) => {
      add(descriptor.feed);
    }),

    replicate: async (feeds) => {
      const replicatedFeeds: HypercoreFeed[] = [];

      for (const feed of feeds) {
        assert(feed.key);
        const descriptor = await feedStore.openReadOnlyFeed(PublicKey.from(feed.key));
        replicatedFeeds.push(descriptor.feed);
      }

      return replicatedFeeds;
    }
  });

  const proto = new Protocol({
    streamOptions: { live: true },
    discoveryKey: partyKey.asBuffer(),
    userSession: { peerId: PublicKey.stringify(peerId), credentials },
    initiator: !!protocolOptions?.initiator
  })
    .setExtension(auth.createExtension())
    .setExtension(repl.createExtension())
    .init();

  return { id: peerId, auth, authPromise, proto, repl, feed, feedStore, append, getMessages };
};

/**
 * Pipe two Protocol objects together.
 */
const connect = (source: any, target: any) => pump(source.stream, target.stream, source.stream) as any;

type Node = { feed: HypercoreFeed, feedStore: FeedStore }

const getMessages = async (sender: Node, receiver: Node): Promise<any[]> => {
  const { feed } = await receiver.feedStore.openReadOnlyFeed(PublicKey.from(sender.feed.key));
  assert(feed, 'Nodes not connected');
  const messages: any[] = [];
  const stream = createBatchStream(feed);
  stream.on('data', (data) => {
    messages.push(data[0].data);
  });
  return new Promise((resolve, reject) => {
    eos(stream, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(messages);
      }
    });
  });
};

it('Auth Plugin (GOOD)', async () => {
  const keyring = await createTestKeyring();
  const partyKey = PublicKey.from(randomBytes(32));
  const node1 = await createProtocol(partyKey,
    new ExpectedKeyAuthenticator(keyring,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!.publicKey), keyring, { initiator: true });
  const node2 = await createProtocol(partyKey,
    new ExpectedKeyAuthenticator(keyring,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!.publicKey), keyring, { initiator: false });

  const connection = connect(node1.proto, node2.proto);
  await node1.authPromise;
  await node2.authPromise;

  connection.destroy();
});

it('Auth & Repl (GOOD)', async () => {
  const keyring = await createTestKeyring();
  const partyKey = PublicKey.from(randomBytes(32));
  const node2 = await createProtocol(partyKey,
    new ExpectedKeyAuthenticator(keyring,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!.publicKey), keyring, { initiator: true });
  const node1 = await createProtocol(partyKey,
    new ExpectedKeyAuthenticator(keyring,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!.publicKey), keyring, { initiator: false });

  const connection = connect(node1.proto, node2.proto);
  await node1.authPromise;
  await node2.authPromise;

  const message1 = randomBytes(32).toString('hex');
  await node1.append(message1);
  await waitForExpect(async () => {
    const msgs = await getMessages(node1, node2);
    expect(msgs).toContain(message1);
    log(`${message1} on ${PublicKey.stringify(node2.id)}.`);
  });

  const message2 = randomBytes(32).toString('hex');
  await node2.append(message2);
  await waitForExpect(async () => {
    const msgs = await getMessages(node2, node1);
    expect(msgs).toContain(message2);
    log(`${message2} on ${PublicKey.stringify(node1.id)}.`);
  });

  connection.destroy();
});
