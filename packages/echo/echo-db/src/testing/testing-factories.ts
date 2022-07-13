//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Model } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { range } from '@dxos/util';

import { ECHO } from '../echo';
import { CreateItemOption, Item } from '../packlets/database';
import { DataParty } from '../parties';
import { createTestInstance, inviteTestPeer } from './testing';

// TODO(burdon): These are very narrow functions. Refactor into factories.
// TODO(burdon): This is a crime; instead create and return a context map.

export type Awaited<T> = T extends Promise<infer U> ? U : T;

export type TestPeer = Awaited<ReturnType<typeof createTestInstance>>;

export type WithTestMeta<T> = T & { testMeta: TestPeer }

const addTestMeta = <T>(obj: T, meta: TestPeer): WithTestMeta<T> => {
  (obj as any).testMeta = meta;
  return obj as any;
};

/**
 * Creates a number of test ECHO instances and a party that's shared between all of them.
 * @returns Party instances from each of the peers.
 */
const createParties = async (peerCount = 2): Promise<{ peers: ECHO[], parties: WithTestMeta<DataParty>[] }> => {
  assert(peerCount >= 2);

  const peers = await Promise.all(range(peerCount).map(() => createTestInstance({ initialize: true })));

  const initialParty = await peers[0].createParty();
  await initialParty.open();

  const joinedParties = await Promise.all(peers.slice(1).map(async peer => {
    const party = await inviteTestPeer(initialParty, peer);
    await party.open();
    return party;
  }));

  const parties = [initialParty, ...joinedParties].map((party, i) => addTestMeta(party, peers[i]));
  return { peers, parties };
};

/**
 * Creates a number of test ECHO instances and an item that is shared between all of them.
 * @returns Item instances from each of the peers.
 */
export const createModelTestBench = async<M extends Model<any>> (
  options: CreateItemOption<M> & { peerCount?: number}
): Promise<{ peers: ECHO[], items: WithTestMeta<Item<M>>[] }> => {
  const { peers, parties } = await createParties(options.peerCount ?? 2);
  for (const party of parties) {
    const { model = ObjectModel } = options;
    const { modelFactory } = party.testMeta; // TODO(burdon): Remove.
    if (!modelFactory.hasModel(model.meta.type)) {
      modelFactory.registerModel(model);
    }
  }

  // Wait for item to be replicated.
  const item = await parties[0].database.createItem(options);
  await Promise.all(parties.map(async party => {
    if (party.database.getItem(item.id)) {
      return;
    }

    await party.database.select().exec().update.waitFor(() => !!party.database.getItem(item.id));
  }));

  const items = parties
    .map(party => party.database.getItem(item.id)!)
    .map((item, i) => addTestMeta(item, parties[i].testMeta));

  return { peers, items };
};
