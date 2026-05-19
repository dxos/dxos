//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import * as Array from 'effect/Array';
import * as Record from 'effect/Record';

import { Event, asyncReturn, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import { PeerNotFoundError } from './errors';

const MIN_QUERY_INTERVAL = 5_000;

const POLL_INTERVAL = 10_000;

export type CollectionSynchronizerProps = {
  sendCollectionState: (collectionId: string, peerId: PeerId, state: CollectionState) => void;
  queryCollectionState: (collectionId: string, peerId: PeerId) => void;
  shouldSyncCollection: (collectionId: string, peerId: PeerId) => boolean;
};

/**
 * Implements collection sync protocol.
 */
@trace.resource({ lifecycle: true })
export class CollectionSynchronizer extends Resource {
  private readonly _sendCollectionState: CollectionSynchronizerProps['sendCollectionState'];
  private readonly _queryCollectionState: CollectionSynchronizerProps['queryCollectionState'];
  private readonly _shouldSyncCollection: CollectionSynchronizerProps['shouldSyncCollection'];

  /**
   * CollectionId -> State.
   */
  private readonly _perCollectionStates = new Map<string, PerCollectionState>();
  private readonly _activeCollections = new Set<string>();

  private readonly _connectedPeers = new Set<PeerId>();

  public readonly peerCollectionStateUpdated = new Event<{
    collectionId: string;
    peerId: PeerId;
    newDocsAppeared: boolean;
  }>();

  constructor(params: CollectionSynchronizerProps) {
    super();
    this._sendCollectionState = params.sendCollectionState;
    this._queryCollectionState = params.queryCollectionState;
    this._shouldSyncCollection = params.shouldSyncCollection;
  }

  protected override async _open(ctx: Context): Promise<void> {
    scheduleTaskInterval(
      this._ctx,
      async () => {
        for (const collectionId of this._perCollectionStates.keys()) {
          if (this._activeCollections.has(collectionId)) {
            this.refreshCollection(collectionId);
            await asyncReturn();
          }
        }
      },
      POLL_INTERVAL,
    );
  }

  getRegisteredCollectionIds(): string[] {
    return [...this._activeCollections];
  }

  getLocalCollectionState(collectionId: string): CollectionState | undefined {
    return this._perCollectionStates.get(collectionId)?.localState;
  }

  setLocalCollectionState(collectionId: string, state: CollectionState): void {
    this._activeCollections.add(collectionId);

    log.info('setLocalCollectionState', { collectionId, state });
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    perCollectionState.localState = state;

    for (const peerId of this._connectedPeers) {
      this._diffCollectionState(collectionId, peerId);
    }

    this._scheduleBroadcast(collectionId);
  }

  /**
   * Coalesce bursts of `setLocalCollectionState` (e.g. from `_onHeadsChanged` during an
   * import) into one broadcast microtask per collection. If another call arrives while
   * the microtask is pending, we just flag the collection dirty — the in-flight run
   * already reads the latest `localState`. If it arrives during the run itself, we
   * schedule exactly one follow-up.
   */
  private _scheduleBroadcast(collectionId: string): void {
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    queueMicrotask(() => {
      this._refreshInterestedPeers(collectionId);
      this._broadcastLocalState(collectionId);
      this.refreshCollection(collectionId);
    });
  }

  clearLocalCollectionState(collectionId: string): void {
    this._activeCollections.delete(collectionId);
    this._perCollectionStates.delete(collectionId);
    log('clearLocalCollectionState', { collectionId });
  }

  getRemoteCollectionStates(collectionId: string): ReadonlyMap<PeerId, CollectionState> {
    return this._getOrCreatePerCollectionState(collectionId).remoteStates;
  }

  refreshCollection(collectionId: string): void {
    let scheduleAnotherRefresh = false;
    const state = this._getOrCreatePerCollectionState(collectionId);
    for (const peerId of this._connectedPeers) {
      if (state.interestedPeers.has(peerId)) {
        const lastQueried = state.lastQueried.get(peerId) ?? 0;
        if (Date.now() - lastQueried > MIN_QUERY_INTERVAL) {
          state.lastQueried.set(peerId, Date.now());
          this._queryCollectionState(collectionId, peerId);
        } else {
          scheduleAnotherRefresh = true;
        }
      }
    }
    if (scheduleAnotherRefresh) {
      scheduleTask(this._ctx, () => this.refreshCollection(collectionId), MIN_QUERY_INTERVAL);
    }
  }

  /**
   * Callback when a connection to a peer is established.
   */
  onConnectionOpen(peerId: PeerId): void {
    log('onConnectionOpen', { peerId });
    const spanId = getSpanId(peerId);
    // Browser-timeline-only span; the derived ctx is intentionally discarded because
    // the downstream `_queryCollectionState` hop is user-supplied callback land with
    // no ctx plumbing.
    void trace.spanStart({
      id: spanId,
      methodName: SYNC_SPAN_METHOD,
      instance: this,
      parentCtx: this._ctx,
      showInBrowserTimeline: true,
      attributes: { peerId },
    });
    this._connectedPeers.add(peerId);

    queueMicrotask(async () => {
      if (this._ctx.disposed) {
        return;
      }
      for (const [collectionId, state] of this._perCollectionStates.entries()) {
        if (this._activeCollections.has(collectionId) && this._shouldSyncCollection(collectionId, peerId)) {
          state.interestedPeers.add(peerId);
          state.lastQueried.set(peerId, Date.now());
          this._queryCollectionState(collectionId, peerId);
        }
      }
    });
  }

  /**
   * Callback when a connection to a peer is closed.
   */
  onConnectionClosed(peerId: PeerId): void {
    log('onConnectionClosed', { peerId });

    this._connectedPeers.delete(peerId);

    for (const perCollectionState of this._perCollectionStates.values()) {
      perCollectionState.remoteStates.delete(peerId);
      perCollectionState.interestedPeers.delete(peerId);
      perCollectionState.lastQueried.delete(peerId);
      perCollectionState.lastBroadcast.delete(peerId);
    }
  }

  /**
   * Callback when a peer queries the state of a collection.
   *
   * If we have no local state yet we silently drop the query; the peer will receive our
   * state via {@link _broadcastLocalState} once `setLocalCollectionState` is called.
   */
  onCollectionStateQueried(collectionId: string, peerId: PeerId): void {
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);

    if (perCollectionState.localState) {
      try {
        this._sendCollectionState(collectionId, peerId, withoutEmptyHeads(perCollectionState.localState));
      } catch (error) {
        if (PeerNotFoundError.is(error)) {
          log('peer not found when sending collection state callback', { error });
          return;
        }
        throw error;
      }
    }
  }

  /**
   * Callback when a peer sends the state of a collection.
   */
  onRemoteStateReceived(collectionId: string, peerId: PeerId, state: CollectionState): void {
    log.info('onRemoteStateReceived', { collectionId, peerId, state });
    validateCollectionState(state);
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    const previousRemoteState = perCollectionState.remoteStates.get(peerId);
    if (previousRemoteState && isCollectionStateEqual(previousRemoteState, state)) {
      return;
    }
    perCollectionState.remoteStates.set(peerId, state);
    this._diffCollectionState(collectionId, peerId);
  }

  private _diffCollectionState(collectionId: string, peerId: PeerId) {
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    const remoteState = perCollectionState.remoteStates.get(peerId);
    if (!remoteState) {
      return;
    }

    log('diffCollectionState', { collectionId, peerId });
    const localState = perCollectionState.localState ?? { documents: {} };
    const diff = diffCollectionState(localState, remoteState);
    const spanId = getSpanId(peerId);
    if (diff.different.length === 0) {
      trace.spanEnd(spanId);
    } else {
      // Browser-timeline-only span; see note in onConnectionOpen.
      void trace.spanStart({
        id: spanId,
        methodName: SYNC_SPAN_METHOD,
        instance: this,
        parentCtx: this._ctx,
        showInBrowserTimeline: true,
        attributes: { peerId },
      });
    }
    log('diff', {
      localState: localState.documents,
      remoteState: remoteState.documents,
      missingOnLocal: diff.missingOnLocal,
      missingOnRemote: diff.missingOnRemote,
      different: diff.different,
    });
    log('emit peer collection state update');
    this.peerCollectionStateUpdated.emit({
      peerId,
      collectionId,
      newDocsAppeared: diff.missingOnLocal.length > 0,
    });
  }

  private _getOrCreatePerCollectionState(collectionId: string): PerCollectionState {
    return defaultMap(this._perCollectionStates, collectionId, () => ({
      localState: undefined,
      remoteStates: new Map(),
      interestedPeers: new Set(),
      lastQueried: new Map(),
      lastBroadcast: new Map(),
    }));
  }

  /**
   * Push local state to interested peers whose last-known remote state differs from local
   * (or is unknown), then pull from peers via {@link refreshCollection}.
   *
   * Diff-gating avoids spamming peers that are already in sync; this matters because
   * {@link setLocalCollectionState} is called on every local heads change.
   */
  private _broadcastLocalState(collectionId: string): void {
    if (this._ctx.disposed || !this._activeCollections.has(collectionId)) {
      return;
    }
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
    const localState = perCollectionState.localState;
    if (!localState) {
      return;
    }
    // Edge replicators are pull-only from our perspective: the edge is the source of truth and
    // already holds every doc in the space, so proactively pushing our heads on every local
    // change is wasted work. The edge can still pull our state via `onCollectionStateQueried`.
    for (const peerId of perCollectionState.interestedPeers) {
      if (isEdgePeerId(peerId)) {
        continue;
      }
      const lastBroadcast = perCollectionState.lastBroadcast.get(peerId) ?? 0;
      if (Date.now() - lastBroadcast > MIN_QUERY_INTERVAL) {
        perCollectionState.lastBroadcast.set(peerId, Date.now());
        try {
          this._sendCollectionState(collectionId, peerId, withoutEmptyHeads(localState));
        } catch (error) {
          if (PeerNotFoundError.is(error)) {
            log('peer not found when broadcasting collection state', { error });
            return;
          }
          throw error;
        }
      }
    }
  }

  private _refreshInterestedPeers(collectionId: string): void {
    for (const peerId of this._connectedPeers) {
      if (this._shouldSyncCollection(collectionId, peerId)) {
        this._getOrCreatePerCollectionState(collectionId).interestedPeers.add(peerId);
      } else {
        this._getOrCreatePerCollectionState(collectionId).interestedPeers.delete(peerId);
      }
    }
  }
}

type PerCollectionState = {
  localState?: CollectionState;
  remoteStates: Map<PeerId, CollectionState>;
  interestedPeers: Set<PeerId>;
  lastQueried: Map<PeerId, number>;
  lastBroadcast: Map<PeerId, number>;
};

export type CollectionState = {
  /**
   * DocumentId -> Heads.
   */
  documents: Record<DocumentId, Heads>;
};

export type CollectionStateDiff = {
  missingOnRemote: DocumentId[];
  missingOnLocal: DocumentId[];
  different: DocumentId[];
};

export const isCollectionStateEqual = (local: CollectionState, remote: CollectionState): boolean => {
  const diff = diffCollectionState(local, remote);
  return diff.different.length === 0 && diff.missingOnLocal.length === 0 && diff.missingOnRemote.length === 0;
};

/**
 * Strip entries whose heads array is empty before sending a CollectionState
 * over the wire. Empty-heads entries are inert (they don't participate in the
 * diff thanks to `Record.filter` in {@link diffCollectionState}) but they
 * inflate the on-wire payload AND end up advertised as "I know about this
 * document with no commits" to the receiver — leaking sedimentree ids that
 * leaked into the local store from other spaces via the subduction
 * fingerprint exchange. Filtering at the send site is the cheapest place to
 * keep collection-state semantics aligned with `diffCollectionState`.
 */
export const withoutEmptyHeads = (state: CollectionState): CollectionState => ({
  documents: Record.filter(state.documents, (heads) => heads.length > 0),
});

export const diffCollectionState = (local: CollectionState, remote: CollectionState): CollectionStateDiff => {
  const localDocuments = Record.filter(local.documents, (heads) => heads.length > 0);
  const remoteDocuments = Record.filter(remote.documents, (heads) => heads.length > 0);
  // NOTE: Using `Array.union` is slow.
  const allDocuments = [...new Set([...Record.keys(localDocuments), ...Record.keys(remoteDocuments)])] as DocumentId[];

  const missingOnRemote: DocumentId[] = [];
  const missingOnLocal: DocumentId[] = [];
  const different: DocumentId[] = [];
  for (const documentId of allDocuments) {
    if (!localDocuments[documentId]) {
      missingOnLocal.push(documentId);
    } else if (!remoteDocuments[documentId]) {
      missingOnRemote.push(documentId);
    } else if (!A.equals(local.documents[documentId], remote.documents[documentId])) {
      different.push(documentId);
    }
  }

  return {
    missingOnRemote,
    missingOnLocal,
    different,
  };
};

const validateCollectionState = (state: CollectionState) => {
  Object.entries(state.documents).forEach(([documentId, heads]) => {
    if (!isValidDocumentId(documentId as DocumentId)) {
      throw new Error(`Invalid documentId: ${documentId}`);
    }
    if (Array.isArray(heads) && heads.some((head) => typeof head !== 'string')) {
      throw new Error(`Invalid heads: ${heads}`);
    }
  });
};

const isValidDocumentId = (documentId: DocumentId) => {
  return typeof documentId === 'string' && !documentId.includes(':');
};

const SYNC_SPAN_METHOD = 'syncPeer';

const getSpanId = (peerId: PeerId) => {
  return `collection-sync-${peerId}`;
};
