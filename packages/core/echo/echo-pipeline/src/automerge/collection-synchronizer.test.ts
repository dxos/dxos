//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { range } from '@dxos/util';

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

    const updated = Promise.all([
      peer1.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId2),
      peer2.remoteStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId1),
    ]);

    peer1.setLocalCollectionState(collectionId, STATE_1);
    peer2.setLocalCollectionState(collectionId, STATE_2);

    peer1.refreshCollection(collectionId);
    peer2.refreshCollection(collectionId);

    await updated;

    expect(peer1.getRemoteCollectionStates(collectionId).get(peerId2)).to.deep.equal(STATE_2);
    expect(peer2.getRemoteCollectionStates(collectionId).get(peerId1)).to.deep.equal(STATE_1);
  });

  test('pushes state to all interested peers on setLocalCollectionState', async () => {
    // Push covers peers that queried us before we had state — `onCollectionStateQueried`
    // silently drops that case; without this push the asker would wait up to POLL_INTERVAL
    // for its polling loop to retry (further gated by MIN_QUERY_INTERVAL).
    const peerId1 = 'peer1' as PeerId;
    const peerId2 = 'peer2' as PeerId;
    const collectionId = 'collection-test';

    const sentStates: Array<{ peerId: PeerId; state: CollectionState }> = [];
    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: (_collectionId, peerId, state) => {
        sentStates.push({ peerId, state });
      },
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    peer.onConnectionOpen(peerId1);
    peer.onConnectionOpen(peerId2);

    peer.setLocalCollectionState(collectionId, STATE_1);

    expect(sentStates.map((m) => m.peerId).sort()).to.deep.equal([peerId1, peerId2].sort());
    expect(sentStates.every((m) => m.state === STATE_1)).to.equal(true);
  });

  test('coalesces bursts of setLocalCollectionState into a single broadcast', async () => {
    // Multiple `setLocalCollectionState` calls within one tick should collapse into a
    // single microtask run, broadcasting only the latest state. Guards against
    // amplification when `_onHeadsChanged` fires repeatedly (e.g. during an import).
    const peerId1 = 'peer1' as PeerId;
    const collectionId = 'collection-test';

    const sentStates: CollectionState[] = [];
    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: (_collectionId, _peerId, state) => {
        sentStates.push(state);
      },
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    peer.onConnectionOpen(peerId1);

    peer.setLocalCollectionState(collectionId, STATE_1);
    peer.setLocalCollectionState(collectionId, STATE_1);
    peer.setLocalCollectionState(collectionId, STATE_2);

    expect(sentStates.length).to.equal(1);
    expect(sentStates[0]).to.deep.equal(STATE_2);
  });

  test('does not push when the remote is already in sync', async () => {
    // Diff-gating: after we know a peer's state matches ours, subsequent
    // `setLocalCollectionState` calls with the same state should not re-send.
    const peerId1 = 'peer1' as PeerId;
    const collectionId = 'collection-test';

    const sentStates: CollectionState[] = [];
    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: (_collectionId, _peerId, state) => {
        sentStates.push(state);
      },
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    peer.onConnectionOpen(peerId1);

    // Seed remote state matching what we're about to set locally — simulates the
    // post-convergence steady state.
    peer.onRemoteStateReceived(collectionId, peerId1, structuredClone(STATE_1));

    peer.setLocalCollectionState(collectionId, STATE_1);

    expect(sentStates.length).to.equal(0);
  });

  test('pushes when local diverges from known remote', async () => {
    const peerId1 = 'peer1' as PeerId;
    const collectionId = 'collection-test';

    const sentStates: CollectionState[] = [];
    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: (_collectionId, _peerId, state) => {
        sentStates.push(state);
      },
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    peer.onConnectionOpen(peerId1);
    peer.onRemoteStateReceived(collectionId, peerId1, structuredClone(STATE_1));

    peer.setLocalCollectionState(collectionId, STATE_2);

    expect(sentStates.length).to.equal(1);
    expect(sentStates[0]).to.deep.equal(STATE_2);
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

const TEST_HEADS = range(4).map((i) => A.getHeads(A.from({ i: i.toString() })));

const STATE_1: CollectionState = {
  documents: {
    a: TEST_HEADS[0],
    b: TEST_HEADS[1],
    c: TEST_HEADS[2],
  } as Record<DocumentId, A.Heads>,
};

const STATE_2: CollectionState = {
  documents: {
    a: TEST_HEADS[0],
    b: TEST_HEADS[3],
    d: TEST_HEADS[2],
  } as Record<DocumentId, A.Heads>,
};
