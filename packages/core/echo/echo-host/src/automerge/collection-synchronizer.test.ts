//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { range } from '@dxos/util';

import {
  type CollectionState,
  CollectionSynchronizer,
  diffCollectionState,
  diffCollectionStateForPeer,
  subsetRemoteToLocal,
  withoutEmptyHeads,
} from './collection-synchronizer.ts';

describe('CollectionSynchronizer', () => {
  test('sync two peers', async ({ expect }) => {
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
      peer1.peerCollectionStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId2),
      peer2.peerCollectionStateUpdated.waitFor((ev) => ev.collectionId === collectionId && ev.peerId === peerId1),
    ]);

    peer1.setLocalCollectionState(collectionId, STATE_1);
    peer2.setLocalCollectionState(collectionId, STATE_2);

    peer1.refreshCollection(collectionId);
    peer2.refreshCollection(collectionId);

    await updated;

    expect(peer1.getRemoteCollectionStates(collectionId).get(peerId2)).to.deep.equal(STATE_2);
    expect(peer2.getRemoteCollectionStates(collectionId).get(peerId1)).to.deep.equal(STATE_1);
  });

  test('pushes state to all interested peers on setLocalCollectionState', async ({ expect }) => {
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
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();

    expect(sentStates.map((m) => m.peerId).sort()).to.deep.equal([peerId1, peerId2].sort());
    // `_broadcastLocalState` wraps in `withoutEmptyHeads`, so compare against the
    // wire form (deep-equal — not strict-equal — because the wrapper allocates).
    const expectedWire = withoutEmptyHeads(STATE_1);
    for (const sent of sentStates) {
      expect(sent.state).to.deep.equal(expectedWire);
    }
  });

  test('does not send to a peer after onConnectionClosed', async ({ expect }) => {
    // Regression: `onConnectionClosed` must remove the peer from `interestedPeers`,
    // otherwise the next `_broadcastLocalState` calls `sendCollectionState` for a
    // now-stale peerId and the real network adapter throws "Connection not found.".
    const peerId1 = 'peer1' as PeerId;
    const peerId2 = 'peer2' as PeerId;
    const collectionId = 'collection-test';

    const connected = new Set<PeerId>([peerId1, peerId2]);
    const sentTo: PeerId[] = [];
    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: (_collectionId, peerId) => {
        if (!connected.has(peerId)) {
          throw new Error('Connection not found.');
        }
        sentTo.push(peerId);
      },
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    // Activate the collection before any peer connects so the connect-time
    // microtask adds peers to `interestedPeers` without ever calling
    // `_broadcastLocalState` (so `lastBroadcast` stays unset for them).
    peer.setLocalCollectionState(collectionId, STATE_1);
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();

    peer.onConnectionOpen(peerId1);
    peer.onConnectionOpen(peerId2);
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();

    connected.delete(peerId2);
    peer.onConnectionClosed(peerId2);

    // Without the fix, peer2 is still in `interestedPeers` with no `lastBroadcast`
    // entry, so the broadcast gate passes and `sendCollectionState` throws.
    peer.setLocalCollectionState(collectionId, STATE_2);
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();

    expect(sentTo).to.deep.equal([peerId1]);
  });

  test('re-emits for a stalled peer that keeps repeating an out-of-sync state', async ({ expect }) => {
    // Regression: `onRemoteStateReceived` used to skip the diff whenever the incoming state
    // matched the previous one, regardless of whether that state was in sync with ours. A peer
    // stuck advertising stale heads therefore silenced `peerCollectionStateUpdated` — and with
    // it the `_handleCollectionSync` replication retry — no matter how often the poll re-queried
    // it. Observed in the wild as a document stalled for 10 minutes across ~48 identical polls,
    // cleared only by a reconnect.
    const peerId = 'peer1' as PeerId;
    const collectionId = 'collection-test';

    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: () => {},
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    const updates: PeerId[] = [];
    peer.peerCollectionStateUpdated.on((ev) => {
      updates.push(ev.peerId);
    });

    peer.onConnectionOpen(peerId);
    peer.setLocalCollectionState(collectionId, STATE_1);
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();
    updates.length = 0;

    // STATE_2 diverges from STATE_1 on `b`, and is missing `c` entirely.
    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
    expect(updates).to.deep.equal([peerId]);

    // The poll re-delivers the identical (still diverging) state; each delivery must retry.
    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
    expect(updates).to.deep.equal([peerId, peerId, peerId]);
  });

  test('dedupes an unchanged state once the peer is in sync', async ({ expect }) => {
    // The complement of the regression above: repeating an already-converged state must stay
    // silent, or every healthy peer re-triggers replication on each poll.
    const peerId = 'peer1' as PeerId;
    const collectionId = 'collection-test';

    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: () => {},
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    const updates: PeerId[] = [];
    peer.peerCollectionStateUpdated.on((ev) => {
      updates.push(ev.peerId);
    });

    peer.onConnectionOpen(peerId);
    peer.setLocalCollectionState(collectionId, STATE_1);
    // Flushes the single `queueMicrotask` hop `_scheduleBroadcast`/`onConnectionOpen` schedule.
    await Promise.resolve();
    updates.length = 0;

    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
    expect(updates).to.deep.equal([peerId]);

    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
    peer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
    expect(updates).to.deep.equal([peerId]);
  });

  test('diff collection state', ({ expect }) => {
    const diff = diffCollectionState(STATE_1, STATE_2);

    expect(diff).to.deep.equal({
      missingOnLocal: ['d'],
      missingOnRemote: ['c'],
      different: ['b'],
    });
  });

  test('edge peer diff intersects remote with local key set', ({ expect }) => {
    // Edge ships every sedimentree it knows about (orphans + stale roots).
    // The client-side diff must hide those from `missingOnLocal` and only
    // surface docs that exist on the client's authoritative key set.
    const local: CollectionState = {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[1],
      } as Record<DocumentId, A.Heads>,
    };
    const remoteEdge: CollectionState = {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[1],
        stale1: TEST_HEADS[2],
        stale2: TEST_HEADS[3],
      } as Record<DocumentId, A.Heads>,
    };

    const meshDiff = diffCollectionStateForPeer(local, remoteEdge, { isEdgePeer: false });
    expect(meshDiff.missingOnLocal.sort()).to.deep.equal(['stale1', 'stale2']);

    const edgeDiff = diffCollectionStateForPeer(local, remoteEdge, { isEdgePeer: true });
    expect(edgeDiff).to.deep.equal({
      missingOnLocal: [],
      missingOnRemote: [],
      different: [],
    });

    expect(Object.keys(subsetRemoteToLocal(local, remoteEdge).documents).sort()).to.deep.equal(['a', 'root']);
  });

  test('edge peer diff still surfaces missingOnRemote and different', ({ expect }) => {
    // Subsetting is one-directional: docs the client knows about that the edge
    // hasn't reported yet must still be flagged so we push them.
    const local: CollectionState = {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[1],
        b: TEST_HEADS[2],
      } as Record<DocumentId, A.Heads>,
    };
    const remoteEdge: CollectionState = {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[3],
        stale: TEST_HEADS[2],
      } as Record<DocumentId, A.Heads>,
    };

    const diff = diffCollectionStateForPeer(local, remoteEdge, { isEdgePeer: true });
    expect(diff.missingOnRemote).to.deep.equal(['b']);
    expect(diff.different).to.deep.equal(['a']);
    expect(diff.missingOnLocal).to.deep.equal([]);
  });

  test('peerCollectionStateUpdated fires with newDocsAppeared=false for edge peer orphans', async ({ expect }) => {
    // peerId prefix must satisfy `isEdgePeerId` — anchored on the SUBDUCTION_REPLICATOR
    // service name from `@dxos/protocols`.
    const edgePeerId = 'subduction-replicator:edge-space-1:abc' as PeerId;
    const collectionId = 'collection-test';

    const peer = await new CollectionSynchronizer({
      queryCollectionState: () => {},
      sendCollectionState: () => {},
      shouldSyncCollection: () => true,
    }).open();
    onTestFinished(async () => {
      await peer.close();
    });

    peer.onConnectionOpen(edgePeerId);

    const local: CollectionState = {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[1],
      } as Record<DocumentId, A.Heads>,
    };
    peer.setLocalCollectionState(collectionId, local);

    const eventPromise = peer.peerCollectionStateUpdated.waitFor(
      (ev) => ev.collectionId === collectionId && ev.peerId === edgePeerId,
    );

    peer.onRemoteStateReceived(collectionId, edgePeerId, {
      documents: {
        root: TEST_HEADS[0],
        a: TEST_HEADS[1],
        stale1: TEST_HEADS[2],
        stale2: TEST_HEADS[3],
      } as Record<DocumentId, A.Heads>,
    });

    const event = await eventPromise;
    expect(event.newDocsAppeared).to.equal(false);
  });

  // Field regression (stuck-sync report): an edge peer's `getAllHeads()` mixes raw commit tips
  // with fragment heads, so it legitimately reports a superset of the host's change tips —
  // sharing one head is convergence. Sharing none is real divergence, and only that case may be
  // reported as `different`; conflating the two either spams repair or hides a stuck document.
  describe('edge head-set asymmetry', () => {
    const documentId = 'doc-1' as DocumentId;
    const localHeads = TEST_HEADS[0];
    const asEdge = { isEdgePeer: true };

    test('a superset that shares a head is not different', ({ expect }) => {
      const diff = diffCollectionStateForPeer(
        { documents: { [documentId]: localHeads } as Record<DocumentId, A.Heads> },
        {
          documents: {
            [documentId]: [...localHeads, ...TEST_HEADS[1], ...TEST_HEADS[2], ...TEST_HEADS[3]],
          } as Record<DocumentId, A.Heads>,
        },
        asEdge,
      );
      expect(diff.different).toEqual([]);
      expect(diff.missingOnLocal).toEqual([]);
      expect(diff.missingOnRemote).toEqual([]);
    });

    test('a disjoint head set is different, and stays different when re-diffed', ({ expect }) => {
      const local = { documents: { [documentId]: localHeads } as Record<DocumentId, A.Heads> };
      const remote = { documents: { [documentId]: TEST_HEADS[1] } as Record<DocumentId, A.Heads> };

      // The observed failure re-diffs identically every poll: the diff is a pure function of the
      // two states, so nothing about repeating it converges. Repair has to come from elsewhere.
      for (const _pass of range(3)) {
        const diff = diffCollectionStateForPeer(local, remote, asEdge);
        expect(diff.different).toEqual([documentId]);
      }
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
