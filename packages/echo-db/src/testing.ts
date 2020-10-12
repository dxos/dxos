//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import ram from 'random-access-memory';

import { Keyring, KeyStore, KeyType } from '@dxos/credentials';
import { humanize } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { Model, ModelFactory } from '@dxos/model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { jsonReplacer, range } from '@dxos/util';

import { ECHO } from './echo';
import { FeedStoreAdapter } from './feed-store-adapter';
import { Item } from './items';
import { ItemCreationOptions } from './items/database';
import { IdentityManager, Party, PartyManager } from './parties';
import { PartyFactory } from './parties/party-factory';

const log = debug('dxos:echo:database:test,dxos:*:error');

export interface TestOptions {
  verboseLogging?: boolean
  initialized?: boolean
  storage?: any
  keyStorage?: any
  swarmProvider?: SwarmProvider
}

/**
 * Creates ECHO instance for testing.
 */
export async function createTestInstance ({
  verboseLogging = false,
  initialized = false,
  storage = ram,
  keyStorage = undefined,
  swarmProvider = new SwarmProvider()
}: TestOptions = {}) {
  const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  const identityManager = new IdentityManager(new Keyring(new KeyStore(keyStorage)));

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel);

  const options = verboseLogging ? {
    readLogger: messageLogger('>>>'),
    writeLogger: messageLogger('<<<')
  } : undefined;

  const networkManager = new NetworkManager(feedStore, swarmProvider);
  const partyFactory = new PartyFactory(identityManager, feedStoreAdapter, modelFactory, networkManager, options);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  const echo = new ECHO(partyManager, options);

  if (initialized) {
    await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });

    await partyManager.open();
    await partyManager.createHalo({ identityDisplayName: humanize(identityManager.identityKey.publicKey) });

    await echo.open();
  }

  return { echo, partyManager, modelFactory, identityManager, feedStoreAdapter, feedStore };
}

export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type TestPeer = Awaited<ReturnType<typeof createTestInstance>>;

export type WithTestMeta<T> = T & { testMeta: TestPeer }

function addTestMeta<T> (obj: T, meta: TestPeer): WithTestMeta<T> {
  (obj as any).testMeta = meta;
  return obj as any;
}

/**
 * Invites a test peer to the party.
 * @returns Party instance on provided test instance.
 */
export async function inviteTestPeer (party: Party, peer: ECHO): Promise<Party> {
  const invitation = await party.createInvitation({
    secretValidator: async () => true
  });
  return peer.joinParty(invitation, async () => Buffer.from('0000'));
}

/**
 * Creates a number of test ECHO instances and a party that's shared between all of them.
 * @returns Party instances from each of the peers.
 */
export async function createSharedTestParty (peerCount = 2): Promise<WithTestMeta<Party>[]> {
  assert(peerCount >= 2);

  const peers = await Promise.all(range(peerCount).map(() => createTestInstance({ initialized: true })));

  const mainParty = await peers[0].echo.createParty();
  await mainParty.open();

  const restParties = await Promise.all(peers.slice(1).map(async peer => {
    const party = await inviteTestPeer(mainParty, peer.echo);
    await party.open();
    return party;
  }));

  return [mainParty, ...restParties].map((party, i) => addTestMeta(party, peers[i]));
}

/**
 * Creates a number of test ECHO instances and an item that's shared between all of them.
 * @returns Item instances from each of the peers.
 */
export async function createModelTestBench<M extends Model<any>> (options: ItemCreationOptions<M> & { peerCount?: number}): Promise<WithTestMeta<Item<M>>[]> {
  const parties = await createSharedTestParty(options.peerCount ?? 2);

  for (const party of parties) {
    const { modelFactory } = party.testMeta;
    if (!modelFactory.hasModel(options.model.meta.type)) {
      modelFactory.registerModel(options.model);
    }
  }

  const item = await parties[0].database.createItem(options);
  await Promise.all(parties.map(async party => {
    if (party.database.getItem(item.id)) {
      return;
    }
    await party.database.queryItems().update.waitFor(() => !!party.database.getItem(item.id));
  }));

  return parties.map(party => party.database.getItem(item.id)!).map((item, i) => addTestMeta(item, parties[i].testMeta));
}

const messageLogger = (tag: string) => (message: any) => { log(tag, JSON.stringify(message, jsonReplacer, 2)); };
