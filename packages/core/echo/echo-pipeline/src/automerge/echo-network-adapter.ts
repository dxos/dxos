//
// Copyright 2024 DXOS.org
//

import { synchronized, Trigger } from '@dxos/async';
import { NetworkAdapter, type Message, type PeerId, type PeerMetadata } from '@dxos/automerge/automerge-repo';
import { LifecycleState } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import {
  type EchoReplicator,
  type ReplicatorConnection,
  type ShouldAdvertiseParams,
  type ShouldSyncCollectionParams,
} from './echo-replicator';
import {
  isCollectionQueryMessage,
  isCollectionStateMessage,
  type CollectionQueryMessage,
  type CollectionStateMessage,
} from './network-protocol';

export type EchoNetworkAdapterParams = {
  getContainingSpaceForDocument: (documentId: string) => Promise<PublicKey | null>;
  onCollectionStateQueried: (collectionId: string, peerId: PeerId) => void;
  onCollectionStateReceived: (collectionId: string, peerId: PeerId, state: unknown) => void;
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

  constructor(private readonly _params: EchoNetworkAdapterParams) {
    super();
  }

  override connect(peerId: PeerId, peerMetadata?: PeerMetadata | undefined): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
    this._connected.wake();
  }

  override send(message: Message): void {
    const connectionEntry = this._connections.get(message.targetId);
    if (!connectionEntry) {
      throw new Error('Connection not found.');
    }

    // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
    connectionEntry.writer.write(message).catch((err) => {
      if (connectionEntry.isOpen) {
        log.catch(err);
      }
    });
  }

  override disconnect(): void {
    // No-op
  }

  @synchronized
  async open() {
    if (this._lifecycleState === LifecycleState.OPEN) {
      return;
    }
    this._lifecycleState = LifecycleState.OPEN;

    log('emit ready');
    this.emit('ready', {
      network: this,
    });
  }

  @synchronized
  async close() {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return this;
    }

    for (const replicator of this._replicators) {
      await replicator.disconnect();
    }
    this._replicators.clear();

    this._lifecycleState = LifecycleState.CLOSED;
  }

  async whenConnected() {
    await this._connected.wait({ timeout: 10_000 });
  }

  @synchronized
  async addReplicator(replicator: EchoReplicator) {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this.peerId);
    invariant(!this._replicators.has(replicator));

    this._replicators.add(replicator);
    await replicator.connect({
      peerId: this.peerId,
      onConnectionOpen: this._onConnectionOpen.bind(this),
      onConnectionClosed: this._onConnectionClosed.bind(this),
      onConnectionAuthScopeChanged: this._onConnectionAuthScopeChanged.bind(this),
      getContainingSpaceForDocument: this._params.getContainingSpaceForDocument,
    });
  }

  @synchronized
  async removeReplicator(replicator: EchoReplicator) {
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
    this.send(message);
  }

  sendCollectionState(collectionId: string, targetId: PeerId, state: unknown): void {
    const message: CollectionStateMessage = {
      type: 'collection-state',
      senderId: this.peerId as PeerId,
      targetId,
      collectionId,
      state,
    };
    this.send(message);
  }

  // TODO(dmaretskyi): Remove.
  getPeersInterestedInCollection(collectionId: string): PeerId[] {
    return Array.from(this._connections.values())
      .map((connection) => {
        return connection.connection.shouldSyncCollection({ collectionId })
          ? (connection.connection.peerId as PeerId)
          : null;
      })
      .filter(nonNullable);
  }

  private _onConnectionOpen(connection: ReplicatorConnection) {
    log('Connection opened', { peerId: connection.peerId });
    invariant(!this._connections.has(connection.peerId as PeerId));
    const reader = connection.readable.getReader();
    const writer = connection.writable.getWriter();
    const connectionEntry: ConnectionEntry = { connection, reader, writer, isOpen: true };
    this._connections.set(connection.peerId as PeerId, connectionEntry);

    queueMicrotask(async () => {
      try {
        while (true) {
          // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          this._onMessage(value);
        }
      } catch (err) {
        if (connectionEntry.isOpen) {
          log.catch(err);
        }
      }
    });

    log('emit peer-candidate', { peerId: connection.peerId });
    this._emitPeerCandidate(connection);
  }

  private _onMessage(message: Message) {
    if (isCollectionQueryMessage(message)) {
      this._params.onCollectionStateQueried(message.collectionId, message.senderId);
    } else if (isCollectionStateMessage(message)) {
      this._params.onCollectionStateReceived(message.collectionId, message.senderId, message.state);
    } else {
      this.emit('message', message);
    }
  }

  /**
   * Trigger doc-synchronizer shared documents set recalculation. Happens on peer-candidate.
   * TODO(y): replace with a proper API call when sharePolicy update becomes supported by automerge-repo
   */
  private _onConnectionAuthScopeChanged(connection: ReplicatorConnection) {
    log('Connection auth scope changed', { peerId: connection.peerId });
    const entry = this._connections.get(connection.peerId as PeerId);
    invariant(entry);
    this.emit('peer-disconnected', { peerId: connection.peerId as PeerId });
    this._emitPeerCandidate(connection);
  }

  private _onConnectionClosed(connection: ReplicatorConnection) {
    log('Connection closed', { peerId: connection.peerId });
    const entry = this._connections.get(connection.peerId as PeerId);
    invariant(entry);

    entry.isOpen = false;
    this.emit('peer-disconnected', { peerId: connection.peerId as PeerId });

    void entry.reader.cancel().catch((err) => log.catch(err));
    void entry.writer.abort().catch((err) => log.catch(err));

    this._connections.delete(connection.peerId as PeerId);
  }

  private _emitPeerCandidate(connection: ReplicatorConnection) {
    this.emit('peer-candidate', {
      peerId: connection.peerId as PeerId,
      peerMetadata: createEchoPeerMetadata(),
    });
  }
}

type ConnectionEntry = {
  connection: ReplicatorConnection;
  reader: ReadableStreamDefaultReader<Message>;
  writer: WritableStreamDefaultWriter<Message>;
  isOpen: boolean;
};

export const createEchoPeerMetadata = (): PeerMetadata =>
  ({
    // TODO(dmaretskyi): Refactor this.
    dxos_peerSource: 'EchoNetworkAdapter',
  }) as any;

export const isEchoPeerMetadata = (metadata: PeerMetadata): boolean =>
  (metadata as any)?.dxos_peerSource === 'EchoNetworkAdapter';
