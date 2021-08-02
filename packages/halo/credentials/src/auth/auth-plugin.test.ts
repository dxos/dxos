//
// Copyright 2019 DXOS.org
//

// dxos-testing-browser

import debug from 'debug';
import eos from 'end-of-stream';
import pify from 'pify';
import pump from 'pump';
import waitForExpect from 'wait-for-expect';

import { keyToString, randomBytes, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { Protocol, ProtocolOptions } from '@dxos/protocol';
import { Replicator } from '@dxos/protocol-plugin-replicator';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { Keyring } from '../keys';
import { codec, codecLoop, KeyType } from '../proto';
import { createAuthMessage } from './auth-message';
import { AuthPlugin } from './auth-plugin';
import { Authenticator } from './authenticator';

const log = debug('dxos:creds:auth:test');

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
class ExpectedKeyAuthenticator extends Authenticator {
  constructor (
    private _keyring: Keyring,
    private _expectedKey: PublicKey
  ) {
    super();
  }

  override async authenticate (credentials: any) { // TODO(marik-d): Use more specific type
    if (this._keyring.verify(credentials)) {
      if (this._expectedKey.equals(credentials.signatures[0].key)) {
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
  const topic = partyKey.toHex();
  const identityKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
  const deviceKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  const peerId = deviceKey!.publicKey.asBuffer();
  const feedStore = await new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf8' } });
  await feedStore.open();
  const feed = await feedStore.openFeed(`/topic/${topic}/writable`, { metadata: { topic } });
  const append = pify(feed.append.bind(feed));

  const credentials = Buffer.from(codec.encode(
    codecLoop(createAuthMessage(keyring, partyKey, identityKey!, deviceKey!))
  )).toString('base64');

  const auth = new AuthPlugin(peerId, authenticator, [Replicator.extension]);
  const authPromise = new Promise((resolve) => {
    auth.on('authenticated', (incomingPeerId) => {
      log(`Authenticated ${keyToString(incomingPeerId)} on ${keyToString(peerId)}`);
      resolve(true);
    });
  });

  const openFeed = async (key: Buffer) => {
    return feedStore.getOpenFeed((desc: any) => desc.feed.key.equals(key)) ||
      feedStore.openFeed(`/topic/${topic}/readable/${keyToString(key)}`, { key, metadata: { topic } });
  };

  // Share and replicate all known feeds.
  const repl = new Replicator({
    load: async () => {
      return feedStore.getOpenFeeds();
    },

    subscribe: (add: (feed: any) => void) => {
      const onFeed = (feed: any) => add(feed);
      feedStore.on('feed', onFeed);
      return () => {
        feedStore.removeListener('feed', onFeed);
      };
    },

    replicate: async (feeds: any[]) => {
      for await (const feed of feeds) {
        if (feed.key) {
          await openFeed(feed.key);
        }
      }

      return feedStore.getOpenFeeds();
    }
  });

  const getMessages = async () => {
    const messages: { data: unknown }[] = [];
    const stream = feedStore.createReadStream();
    stream.on('data', ({ data }: any) => {
      messages.push(data);
    });

    return new Promise((resolve, reject) => {
      eos(stream, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(messages.sort());
        }
      });
    });
  };

  const proto = new Protocol({
    streamOptions: { live: true },
    discoveryKey: partyKey.asBuffer(),
    userSession: { peerId: keyToString(peerId), credentials },
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
const connect = (source: any, target: any) => {
  return pump(source.stream, target.stream, source.stream) as any;
};

test('Auth Plugin (GOOD)', async () => {
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

test('Auth & Repl (GOOD)', async () => {
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
    const msgs = await node2.getMessages();
    expect(msgs).toContain(message1);
    log(`${message1} on ${keyToString(node2.id)}.`);
  });

  const message2 = randomBytes(32).toString('hex');
  await node2.append(message2);
  await waitForExpect(async () => {
    const msgs = await node1.getMessages();
    expect(msgs).toContain(message2);
    log(`${message2} on ${keyToString(node1.id)}.`);
  });

  connection.destroy();
});
