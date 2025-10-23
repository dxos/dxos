//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';

import { type CollectionState, CollectionSynchronizer, diffCollectionState } from './collection-synchronizer';

describe('CollectionSynchronizer', () => {
  test('sync two peers', async () => {
    const LATENCY = 10;

    const peerId1 = 'peer1' as PeerId;
    const peerId2 = 'peer2' as PeerId;
    const collectionId = 'collection-test';

    const peer1 = await new CollectionSynchronizer({
      queryCollectionState: (collectionId, peerId) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer2.onCollectionStateQueried(collectionId, peerId);
        }),
      sendCollectionState: (collectionId, peerId, state) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer2.onRemoteStateReceived(collectionId, peerId, structuredClone(state));
        }),
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer1.close();
    });
    const peer2 = await new CollectionSynchronizer({
      queryCollectionState: (collectionId, peerId) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer1.onCollectionStateQueried(collectionId, peerId);
        }),
      sendCollectionState: (collectionId, peerId, state) =>
        queueMicrotask(async () => {
          await sleep(LATENCY);
          peer1.onRemoteStateReceived(collectionId, peerId, structuredClone(state));
        }),
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer2.close();
    });

    peer1.onConnectionOpen(peerId2);
    peer2.onConnectionOpen(peerId1);

    peer1.setLocalCollectionState(collectionId, STATE_1);
    peer2.setLocalCollectionState(collectionId, STATE_2);

    peer1.refreshCollection(collectionId);
    peer2.refreshCollection(collectionId);

    await Promise.all([
      peer1.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId2),
      peer2.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId1),
    ]);

    expect(peer1.getRemoteCollectionStates(collectionId).get(peerId2)).to.deep.equal(STATE_2);
    expect(peer2.getRemoteCollectionStates(collectionId).get(peerId1)).to.deep.equal(STATE_1);
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

const STATE_1: CollectionState = {
  documents: {
    a: ['1'],
    b: ['2'],
    c: ['3'],
  } as Record<DocumentId, Heads>,
};

const STATE_2: CollectionState = {
  documents: {
    a: ['1'],
    b: ['4'],
    d: ['3'],
  } as Record<DocumentId, Heads>,
};
