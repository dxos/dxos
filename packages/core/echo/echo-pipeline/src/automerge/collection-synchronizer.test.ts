//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as Automerge from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { range } from '@dxos/util';

import { type CollectionState, CollectionSynchronizer, diffCollectionState } from './collection-synchronizer';

describe('CollectionSynchronizer', () => {
  test('sync two peers', async () => {
    const LATENCY = 10;

    const peerId1 = 'peer1' as PeerId;
    const peerId2 = 'peer2' as PeerId;
    const collectionId = 'collection-test';

    const peer1 = await new CollectionSynchronizer({
      queryCollectionState: (ctx, collectionId, peerId) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer2.onCollectionStateQueried(Context.default(), collectionId, peerId);
        }),
      sendCollectionState: (ctx, collectionId, peerId, state) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer2.onRemoteStateReceived(Context.default(), collectionId, peerId, structuredClone(state));
        }),
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer1.close();
    });
    const peer2 = await new CollectionSynchronizer({
      queryCollectionState: (ctx, collectionId, peerId) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer1.onCollectionStateQueried(Context.default(), collectionId, peerId);
        }),
      sendCollectionState: (ctx, collectionId, peerId, state) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer1.onRemoteStateReceived(Context.default(), collectionId, peerId, structuredClone(state));
        }),
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer2.close();
    });

    peer1.onConnectionOpen(Context.default(), peerId2);
    peer2.onConnectionOpen(Context.default(), peerId1);

    const updated = Promise.all([
      peer1.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId2),
      peer2.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId1),
    ]);

    peer1.setLocalCollectionState(Context.default(), collectionId, STATE_1);
    peer2.setLocalCollectionState(Context.default(), collectionId, STATE_2);

    peer1.refreshCollection(Context.default(), collectionId);
    peer2.refreshCollection(Context.default(), collectionId);

    await updated;

    expect(peer1.getRemoteCollectionStates(Context.default(), collectionId).get(peerId2)).to.deep.equal(STATE_2);
    expect(peer2.getRemoteCollectionStates(Context.default(), collectionId).get(peerId1)).to.deep.equal(STATE_1);
  });

  test('diff collection state', () => {
    const diff = diffCollectionState(STATE_1, STATE_2);

    expect(diff).to.deep.equal({
      missingOnLocal: ['d'],
      missingOnRemote: ['c'],
      different: ['b'],
    });
  });
});

const TEST_HEADS = range(4).map((i) => Automerge.getHeads(Automerge.from({ i: i.toString() })));

const STATE_1: CollectionState = {
  documents: {
    a: TEST_HEADS[0],
    b: TEST_HEADS[1],
    c: TEST_HEADS[2],
  } as Record<DocumentId, Heads>,
};

const STATE_2: CollectionState = {
  documents: {
    a: TEST_HEADS[0],
    b: TEST_HEADS[3],
    d: TEST_HEADS[2],
  } as Record<DocumentId, Heads>,
};
