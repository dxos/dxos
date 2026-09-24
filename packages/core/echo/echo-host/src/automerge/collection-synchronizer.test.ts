//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import { afterEach, beforeEach, describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { SpaceId } from '@dxos/keys';
import { type StartSpanOptions, TRACE_PROCESSOR, type TracingBackend } from '@dxos/tracing';
import { range } from '@dxos/util';

import {
  type CollectionState,
  CollectionSynchronizer,
  diffCollectionState,
  diffCollectionStateForPeer,
  subsetRemoteToLocal,
  withoutEmptyHeads,
} from './collection-synchronizer.ts';
import { deriveCollectionIdFromSpaceId } from './space-collection.ts';

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

  // The `syncPeer` span feeds the sync-latency dashboard, so when it opens and how it ends is its contract.
  describe('sync span', () => {
    const peerId = 'peer1' as PeerId;
    let savedBackend: TracingBackend;
    let spans: RecordedSpan[];
    let spaceId: SpaceId;
    let collectionId: string;

    beforeEach(() => {
      savedBackend = TRACE_PROCESSOR.tracingBackend;
      spans = [];
      TRACE_PROCESSOR.tracingBackend = createRecordingBackend(spans);
      // Installing a backend replays the spans earlier tests buffered; only this test's own are under test.
      spans.length = 0;
      spaceId = SpaceId.random();
      collectionId = deriveCollectionIdFromSpaceId(spaceId);
    });

    afterEach(() => {
      TRACE_PROCESSOR.tracingBackend = savedBackend;
    });

    const spansFor = (id: string) => spans.filter((span) => span.options.attributes?.['ctx.collectionId'] === id);

    const openSynchronizer = async () => {
      const synchronizer = await new CollectionSynchronizer({
        queryCollectionState: () => {},
        sendCollectionState: () => {},
        shouldSyncCollection: () => true,
      }).open();
      onTestFinished(async () => {
        await synchronizer.close();
      });
      return synchronizer;
    };

    test('opens no span for a peer that is already in sync', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      // Connecting is not divergence: only a diff with work outstanding opens a span.
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
      await Promise.resolve();

      expect(spans).toEqual([]);
    });

    test('stays open until the peer is fully synced, not only until no document differs', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, {
        documents: { a: TEST_HEADS[0] } as Record<DocumentId, A.Heads>,
      });

      // `b` is only missing locally, so nothing is `different` yet the peer is not synced.
      const remote: CollectionState = {
        documents: { a: TEST_HEADS[0], b: TEST_HEADS[1] } as Record<DocumentId, A.Heads>,
      };
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(remote));
      // A stalled peer repeats itself; the span keeps measuring from the first divergence.
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(remote));

      const [span, ...rest] = spansFor(collectionId);
      expect(rest).toEqual([]);
      expect(span.options.name).toBe('CollectionSynchronizer.syncPeer');
      expect(span.options.attributes).toEqual({
        'ctx.peerId': peerId,
        'ctx.collectionId': collectionId,
        'ctx.spaceId': spaceId,
        'ctx.trigger': 'initial',
        'ctx.missingOnLocal': 1,
        'ctx.missingOnRemote': 0,
        'ctx.different': 0,
      });
      expect(span.ended).toBe(false);

      synchronizer.setLocalCollectionState(collectionId, structuredClone(remote));
      expect(span.ended).toBe(true);
      expect(span.endAttributes).toEqual({ 'ctx.outcome': 'synced' });
    });

    test('tags each span with what exposed the divergence', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);

      // The peer's first state diverges, then the peer catches up.
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
      // A local change diverges, then the peer catches up.
      synchronizer.setLocalCollectionState(collectionId, STATE_2);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      // The peer changes, then we catch up.
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));
      synchronizer.setLocalCollectionState(collectionId, STATE_1);

      expect(
        spansFor(collectionId).map((span) => [
          span.options.attributes?.['ctx.trigger'],
          span.endAttributes?.['ctx.outcome'],
        ]),
      ).toEqual([
        ['initial', 'synced'],
        ['local', 'synced'],
        ['remote', 'synced'],
      ]);
    });

    test('opens a new span each time the pair diverges again after syncing', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));

      // An edit to `b` diverges, then the peer catches up.
      const edited: CollectionState = {
        documents: { ...STATE_1.documents, b: TEST_HEADS[3] } as Record<DocumentId, A.Heads>,
      };
      synchronizer.setLocalCollectionState(collectionId, edited);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(edited));
      // A new document diverges again, then the peer catches up again.
      const created: CollectionState = {
        documents: { ...edited.documents, d: TEST_HEADS[0] } as Record<DocumentId, A.Heads>,
      };
      synchronizer.setLocalCollectionState(collectionId, created);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(created));

      expect(
        spansFor(collectionId).map((span) => ({
          trigger: span.options.attributes?.['ctx.trigger'],
          different: span.options.attributes?.['ctx.different'],
          missingOnRemote: span.options.attributes?.['ctx.missingOnRemote'],
          outcome: span.endAttributes?.['ctx.outcome'],
        })),
      ).toEqual([
        { trigger: 'local', different: 1, missingOnRemote: 0, outcome: 'synced' },
        { trigger: 'local', different: 0, missingOnRemote: 1, outcome: 'synced' },
      ]);
    });

    test('opens a new span when the pair diverges again after reconnecting', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      synchronizer.onConnectionClosed(peerId);

      synchronizer.onConnectionOpen(peerId);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));

      expect(
        spansFor(collectionId).map((span) => [
          span.options.attributes?.['ctx.trigger'],
          span.endAttributes?.['ctx.outcome'],
        ]),
      ).toEqual([
        ['initial', 'disconnected'],
        ['initial', 'synced'],
      ]);
    });

    test('compares a state that arrived before registration once the collection registers', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      expect(spans).toEqual([]);

      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));

      expect(
        spansFor(collectionId).map((span) => [
          span.options.attributes?.['ctx.trigger'],
          span.endAttributes?.['ctx.outcome'],
        ]),
      ).toEqual([['initial', 'synced']]);
    });

    test('opens no span for a late state from a gone peer or a cleared collection', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));

      synchronizer.clearLocalCollectionState(collectionId);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));

      const otherCollectionId = deriveCollectionIdFromSpaceId(SpaceId.random());
      synchronizer.setLocalCollectionState(otherCollectionId, STATE_1);
      synchronizer.onConnectionClosed(peerId);
      synchronizer.onRemoteStateReceived(otherCollectionId, peerId, structuredClone(STATE_2));

      expect(spans).toEqual([]);
    });

    test('ends as disconnected when the peer drops before syncing', async ({ expect }) => {
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      synchronizer.setLocalCollectionState(collectionId, STATE_1);
      synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));

      synchronizer.onConnectionClosed(peerId);

      const [span] = spansFor(collectionId);
      expect(span.ended).toBe(true);
      expect(span.endAttributes).toEqual({ 'ctx.outcome': 'disconnected' });
    });

    test('ends as closed with its collection or synchronizer, and opens none after close', async ({ expect }) => {
      const otherCollectionId = deriveCollectionIdFromSpaceId(SpaceId.random());
      const synchronizer = await openSynchronizer();
      synchronizer.onConnectionOpen(peerId);
      for (const id of [collectionId, otherCollectionId]) {
        synchronizer.setLocalCollectionState(id, STATE_1);
        synchronizer.onRemoteStateReceived(id, peerId, structuredClone(STATE_2));
      }

      synchronizer.clearLocalCollectionState(collectionId);
      expect(spansFor(collectionId).map((span) => span.endAttributes)).toEqual([{ 'ctx.outcome': 'closed' }]);
      expect(spansFor(otherCollectionId).map((span) => span.ended)).toEqual([false]);

      await synchronizer.close();
      expect(spansFor(otherCollectionId).map((span) => span.endAttributes)).toEqual([{ 'ctx.outcome': 'closed' }]);

      // A late diverging state after close must not open a span that nothing would end.
      synchronizer.onRemoteStateReceived(otherCollectionId, peerId, {
        documents: { a: TEST_HEADS[3] } as Record<DocumentId, A.Heads>,
      });
      expect(spansFor(otherCollectionId)).toHaveLength(1);
    });

    test('keeps the spans of synchronizers that share a peer apart', async ({ expect }) => {
      const first = await openSynchronizer();
      const second = await openSynchronizer();
      for (const synchronizer of [first, second]) {
        synchronizer.onConnectionOpen(peerId);
        synchronizer.setLocalCollectionState(collectionId, STATE_1);
        synchronizer.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_2));
      }

      first.onRemoteStateReceived(collectionId, peerId, structuredClone(STATE_1));

      expect(spansFor(collectionId).map((span) => span.endAttributes?.['ctx.outcome'])).toEqual(['synced', undefined]);
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

type RecordedSpan = {
  options: StartSpanOptions;
  ended: boolean;
  endAttributes?: Record<string, any>;
};

const createRecordingBackend = (spans: RecordedSpan[]): TracingBackend => ({
  startSpan: (options) => {
    const span: RecordedSpan = { options, ended: false };
    spans.push(span);
    return {
      end: () => {
        span.ended = true;
      },
      setAttributes: (attributes) => {
        span.endAttributes = { ...span.endAttributes, ...attributes };
      },
    };
  },
});
