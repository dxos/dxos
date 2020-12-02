//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { createKeyPair } from '@dxos/crypto';
import { Model } from '@dxos/model-factory';
import { SwarmProvider } from '@dxos/network-manager';
import { Storage } from '@dxos/random-access-multi-storage';
import { jsonReplacer, range } from '@dxos/util';

import { ECHO } from '../echo';
import { Item, ItemCreationOptions } from '../items';
import { Party } from '../parties';
import { createRamStorage } from '../util/persistant-ram-storage';

const log = debug('dxos:echo:database:test,dxos:*:error');

export const messageLogger = (tag: string) => (message: any) => {
  log(tag, JSON.stringify(message, jsonReplacer, 2));
};

export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type TestPeer = Awaited<ReturnType<typeof createTestInstance>>;
export type WithTestMeta<T> = T & { testMeta: TestPeer }

export interface TestOptions {
  verboseLogging?: boolean
  initialize?: boolean
  storage?: any
  snapshotStorage?: Storage,
  keyStorage?: any
  swarmProvider?: SwarmProvider
  snapshots?: boolean,
  snapshotInterval?: number
}

/**
 * Creates ECHO instance for testing.
 */
export async function createTestInstance ({
  verboseLogging = false,
  initialize = false,
  storage = createRamStorage(),
  keyStorage = undefined,
  snapshotStorage = createRamStorage(),
  swarmProvider = new SwarmProvider(),
  snapshots = true,
  snapshotInterval
}: TestOptions = {}) {
  const echo = new ECHO({
    feedStorage: storage,
    keyStorage,
    snapshotStorage,
    snapshotInterval,
    snapshots,
    swarmProvider,
    readLogger: verboseLogging ? messageLogger('>>>') : undefined,
    writeLogger: verboseLogging ? messageLogger('<<<') : undefined
  });

  if (initialize) {
    await echo.open();
    if (!echo.identityKey) {
      await echo.createIdentity(createKeyPair());
    }
    if (!echo.isHaloInitialized) {
      await echo.createHalo();
    }
  }

  return echo;
}

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

  const peers = await Promise.all(range(peerCount).map(() => createTestInstance({ initialize: true })));

  const mainParty = await peers[0].createParty();
  await mainParty.open();

  const restParties = await Promise.all(peers.slice(1).map(async peer => {
    const party = await inviteTestPeer(mainParty, peer);
    await party.open();
    return party;
  }));

  return [mainParty, ...restParties].map((party, i) => addTestMeta(party, peers[i]));
}

/**
 * Creates a number of test ECHO instances and an item that is shared between all of them.
 * @returns Item instances from each of the peers.
 */
// TODO(burdon): This is a very narrow/specific function. Refactor and/or don't export (brittle).
export async function createModelTestBench<M extends Model<any>> (
  options: ItemCreationOptions<M> & { peerCount?: number}
): Promise<WithTestMeta<Item<M>>[]> {
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

  return parties
    .map(party => party.database.getItem(item.id)!)
    .map((item, i) => addTestMeta(item, parties[i].testMeta));
}
