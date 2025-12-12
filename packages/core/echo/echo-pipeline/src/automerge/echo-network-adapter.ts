//
// Copyright 2024 DXOS.org
//

import {
  type DocumentId,
  type Heads,
  type Message,
  NetworkAdapter,
  type PeerId,
  type PeerMetadata,
} from '@automerge/automerge-repo';

import { Event, Trigger, synchronized } from '@dxos/async';
import { LifecycleState } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { AutomergeProtocolMessage } from '@dxos/protocols';
import { isNonNullable } from '@dxos/util';

import { createIdFromSpaceKey } from '../common/space-id';

import {
  type EchoReplicator,
  type RemoteDocumentExistenceCheckParams,
  type ReplicatorConnection,
  type ShouldAdvertiseParams,
  type ShouldSyncCollectionParams,
} from './echo-replicator';
import {
  type CollectionQueryMessage,
  type CollectionStateMessage,
  isCollectionQueryMessage,
  isCollectionStateMessage,
} from './network-protocol';

export interface NetworkDataMonitor {
  recordPeerConnected(peerId: string): void;
  recordPeerDisconnected(peerId: string): void;
  recordMessageSent(message: Message, duration: number): void;
  recordMessageReceived(message: Message): void;
  recordMessageSendingFailed(message: Message): void;
}

export type EchoNetworkAdapterParams = {
  getContainingSpaceForDocument: (documentId: string) => Promise<PublicKey | null>;
  isDocumentInRemoteCollection: (params: RemoteDocumentExistenceCheckParams) => Promise<boolean>;
  onCollectionStateQueried: (collectionId: string, peerId: PeerId) => void;
  onCollectionStateReceived: (collectionId: string, peerId: PeerId, state: unknown) => void;
  monitor?: NetworkDataMonitor;
};

type ConnectionEntry = {
  isOpen: boolean;
  connection: ReplicatorConnection;
  reader: ReadableStreamDefaultReader<AutomergeProtocolMessage>;
  writer: WritableStreamDefaultWriter<AutomergeProtocolMessage>;
  requestedDocuments: Set<DocumentId>;
};

/**
 * Manages a set of {@link EchoReplicator} instances.
 */
export class EchoNetworkAdapter extends NetworkAdapter {
  private readonly _replicators = new Set<EchoReplicator>();
  /**
   * Remote peer id -> connection.
   */
  private readonly _connections = new Map<PeerId, ConnectionEntry>();
  private _lifecycleState: LifecycleState = LifecycleState.CLOSED;
  private readonly _connected = new Trigger();
  private readonly _ready = new Trigger();

  public readonly documentRequested = new Event<{ documentId: DocumentId; peerId: PeerId }>();

  constructor(private readonly _params: EchoNetworkAdapterParams) {
    super();
  }

  override isReady(): boolean {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  override whenReady(): Promise<void> {
    return this._ready.wait();
  }

  override connect(peerId: PeerId, peerMetadata?: PeerMetadata | undefined): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
    this._connected.wake();
  }

  override send(message: Message): void {
    this._send(message);
  }

  override disconnect(): void {
    // No-op
  }

  @synchronized
  async open(): Promise<void> {
    if (this._lifecycleState === LifecycleState.OPEN) {
      return;
    }
    this._lifecycleState = LifecycleState.OPEN;
    this._ready.wake();
  }

  @synchronized
  async close(): Promise<this | undefined> {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return this;
    }

    for (const replicator of this._replicators) {
      await replicator.disconnect();
    }
    this._replicators.clear();

    this._ready.reset();
    this._lifecycleState = LifecycleState.CLOSED;
  }

  async whenConnected(): Promise<void> {
    await this._connected.wait({ timeout: 10_000 });
  }

  public onConnectionAuthScopeChanged(peer: PeerId): void {
    const entry = this._connections.get(peer);
    if (entry) {
      this._onConnectionAuthScopeChanged(entry.connection);
    }
  }

  @synchronized
  async addReplicator(replicator: EchoReplicator): Promise<void> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this.peerId);
    invariant(!this._replicators.has(replicator));

    this._replicators.add(replicator);
    await replicator.connect({
      peerId: this.peerId,
      onConnectionOpen: this._onConnectionOpen.bind(this),
      onConnectionClosed: this._onConnectionClosed.bind(this),
      onConnectionAuthScopeChanged: this._onConnectionAuthScopeChanged.bind(this),
      isDocumentInRemoteCollection: this._params.isDocumentInRemoteCollection,
      getContainingSpaceForDocument: this._params.getContainingSpaceForDocument,
      getContainingSpaceIdForDocument: async (documentId) => {
        const key = await this._params.getContainingSpaceForDocument(documentId);
        return key ? createIdFromSpaceKey(key) : null;
      },
    });
  }

  @synchronized
  async removeReplicator(replicator: EchoReplicator): Promise<void> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this._replicators.has(replicator));
    await replicator.disconnect();
    this._replicators.delete(replicator);
  }

  async shouldAdvertise(peerId: PeerId, params: ShouldAdvertiseParams): Promise<boolean> {
    const connection = this._connections.get(peerId);
    if (!connection) {
      return false;
    }

    return connection.connection.shouldAdvertise(params);
  }

  shouldSyncCollection(peerId: PeerId, params: ShouldSyncCollectionParams): boolean {
    const connection = this._connections.get(peerId);
    if (!connection) {
      return false;
    }

    return connection.connection.shouldSyncCollection(params);
  }

  queryCollectionState(collectionId: string, targetId: PeerId): void {
    const message: CollectionQueryMessage = {
      type: 'collection-query',
      senderId: this.peerId as PeerId,
      targetId,
      collectionId,
    };
    this._send(message);
  }

  sendCollectionState(collectionId: string, targetId: PeerId, state: unknown): void {
    const message: CollectionStateMessage = {
      type: 'collection-state',
      senderId: this.peerId as PeerId,
      targetId,
      collectionId,
      state,
    };
    this._send(message);
  }

  // TODO(dmaretskyi): Remove.
  getPeersInterestedInCollection(collectionId: string): PeerId[] {
    return Array.from(this._connections.values())
      .map((connection) => {
        return connection.connection.shouldSyncCollection({ collectionId })
          ? (connection.connection.peerId as PeerId)
          : null;
      })
      .filter(isNonNullable);
  }

  bundleSyncEnabledForPeer(peerId: PeerId): boolean {
    const connection = this._connections.get(peerId);
    if (!connection) {
      return false;
    }
    return connection.connection.bundleSyncEnabled;
  }

  async pushBundle(peerId: PeerId, bundle: { documentId: DocumentId; data: Uint8Array; heads: Heads }[]) {
    const connection = this._connections.get(peerId);
    if (!connection) {
      throw new Error('Connection not found.');
    }
    return connection.connection.pushBundle!(bundle);
  }

  async pullBundle(peerId: PeerId, docHeads: Record<DocumentId, Heads>) {
    const connection = this._connections.get(peerId);
    if (!connection) {
      throw new Error('Connection not found.');
    }
    return connection.connection.pullBundle!(docHeads);
  }

  private _send(message: Message): void {
    const connectionEntry = this._connections.get(message.targetId);
    if (!connectionEntry) {
      throw new Error('Connection not found.');
    }

    // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
    const start = Date.now();
    connectionEntry.writer
      .write(message as AutomergeProtocolMessage)
      .then(() => {
        this._params.monitor?.recordMessageSent(message, Date.now() - start);
      })
      .catch((err) => {
        if (connectionEntry.isOpen) {
          log.catch(err);
        }

        this._params.monitor?.recordMessageSendingFailed(message);
      });
  }

  private _onConnectionOpen(connection: ReplicatorConnection): void {
    log('connection opened', { peerId: connection.peerId });
    invariant(!this._connections.has(connection.peerId as PeerId));
    const connectionEntry: ConnectionEntry = {
      isOpen: true,
      connection,
      reader: connection.readable.getReader(),
      writer: connection.writable.getWriter(),
      requestedDocuments: new Set(),
    };

    this._connections.set(connection.peerId as PeerId, connectionEntry);

    // Read inbound messages.
    queueMicrotask(async () => {
      try {
        while (true) {
          // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
          const { done, value } = await connectionEntry.reader.read();
          if (done) {
            break;
          }

          this._onMessage(connectionEntry, value as Message);
        }
      } catch (err) {
        if (connectionEntry.isOpen) {
          log.catch(err);
        }
      }
    });

    log('emit peer-candidate', { peerId: connection.peerId });
    this._emitPeerCandidate(connection);
    this._params.monitor?.recordPeerConnected(connection.peerId);
  }

  private _onMessage(connectionEntry: ConnectionEntry, message: Message): void {
    const amMessage = message as AutomergeProtocolMessage;
    if (amMessage.type === 'request') {
      this.documentRequested.emit({
        documentId: amMessage.documentId as DocumentId,
        peerId: connectionEntry.connection.peerId as PeerId,
      });
    }

    if (isCollectionQueryMessage(message)) {
      this._params.onCollectionStateQueried(message.collectionId, message.senderId);
    } else if (isCollectionStateMessage(message)) {
      this._params.onCollectionStateReceived(message.collectionId, message.senderId, message.state);
    } else {
      this.emit('message', message);
    }
    this._params.monitor?.recordMessageReceived(message);
  }

  private _onConnectionClosed(connection: ReplicatorConnection): void {
    log('connection closed', { peerId: connection.peerId });
    const entry = this._connections.get(connection.peerId as PeerId);
    invariant(entry);

    entry.isOpen = false;
    this.emit('peer-disconnected', { peerId: connection.peerId as PeerId });
    this._params.monitor?.recordPeerDisconnected(connection.peerId);

    void entry.writer.abort().catch((err) => log.catch(err));
    void entry.reader.cancel().catch((err) => log.catch(err));

    this._connections.delete(connection.peerId as PeerId);
  }

  /**
   * Trigger doc-synchronizer shared documents set recalculation. Happens on peer-candidate.
   * TODO(y): replace with a proper API call when sharePolicy update becomes supported by automerge-repo
   */
  private _onConnectionAuthScopeChanged(connection: ReplicatorConnection): void {
    log('Connection auth scope changed', { peerId: connection.peerId });
    const entry = this._connections.get(connection.peerId as PeerId);
    invariant(entry);
    this.emit('peer-disconnected', { peerId: connection.peerId as PeerId });
    this._emitPeerCandidate(connection);
  }

  private _emitPeerCandidate(connection: ReplicatorConnection): void {
    this.emit('peer-candidate', {
      peerId: connection.peerId as PeerId,
      peerMetadata: createEchoPeerMetadata(),
    });
  }
}

export const createEchoPeerMetadata = (): PeerMetadata =>
  ({
    // TODO(dmaretskyi): Refactor this.
    dxos_peerSource: 'EchoNetworkAdapter',
  }) as any;

export const isEchoPeerMetadata = (metadata: PeerMetadata): boolean =>
  (metadata as any)?.dxos_peerSource === 'EchoNetworkAdapter';
