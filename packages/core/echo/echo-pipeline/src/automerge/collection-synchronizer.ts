//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import type { DocumentId, PeerId } from '@automerge/automerge-repo';
import * as Array from 'effect/Array';
import * as Record from 'effect/Record';

import { Event, asyncReturn, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

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
@trace.resource()
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

  public readonly remoteStateUpdated = new Event<{ collectionId: string; peerId: PeerId; newDocsAppeared: boolean }>();

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

    log('setLocalCollectionState', { collectionId, state });
    this._getOrCreatePerCollectionState(collectionId).localState = state;

    for (const peerId of this._connectedPeers) {
      this._diffCollectionState(collectionId, peerId);
    }

    queueMicrotask(async () => {
      if (!this._ctx.disposed && this._activeCollections.has(collectionId)) {
        this._refreshInterestedPeers(collectionId);
        this.refreshCollection(collectionId);
      }
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
    const spanId = getSpanName(peerId);
    trace.spanStart({
      id: spanId,
      methodName: spanId,
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
    }
  }

  /**
   * Callback when a peer queries the state of a collection.
   */
  onCollectionStateQueried(collectionId: string, peerId: PeerId): void {
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);

    if (perCollectionState.localState) {
      this._sendCollectionState(collectionId, peerId, perCollectionState.localState);
    }
  }

  /**
   * Callback when a peer sends the state of a collection.
   */
  onRemoteStateReceived(collectionId: string, peerId: PeerId, state: CollectionState): void {
    log('onRemoteStateReceived', { collectionId, peerId, state });
    validateCollectionState(state);
    const perCollectionState = this._getOrCreatePerCollectionState(collectionId);
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
    const spanId = getSpanName(peerId);
    if (diff.different.length === 0) {
      trace.spanEnd(spanId);
    } else {
      trace.spanStart({
        id: spanId,
        methodName: spanId,
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
    if (diff.missingOnLocal.length > 0 || diff.different.length > 0 || diff.missingOnRemote.length > 0) {
      log('emit remote state update');
      this.remoteStateUpdated.emit({
        peerId,
        collectionId,
        newDocsAppeared: diff.missingOnLocal.length > 0,
      });
    }
  }

  private _getOrCreatePerCollectionState(collectionId: string): PerCollectionState {
    return defaultMap(this._perCollectionStates, collectionId, () => ({
      localState: undefined,
      remoteStates: new Map(),
      interestedPeers: new Set(),
      lastQueried: new Map(),
    }));
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

const getSpanName = (peerId: PeerId) => {
  return `collection-sync-${peerId}`;
};
