//
// Copyright 2024 DXOS.org
//

import { Trigger, synchronized } from '@dxos/async';
import { type Message, NetworkAdapter, type PeerId, type PeerMetadata } from '@dxos/automerge/automerge-repo';
import { LifecycleState } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type EchoReplicator, type ReplicatorConnection, type ShouldAdvertizeParams } from './echo-replicator';
import { PublicKey } from '@dxos/keys';

export type EchoNetworkAdapterParams = {
  getContainingSpaceForDocument: (documentId: string) => Promise<PublicKey | null>;
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
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._lifecycleState = LifecycleState.OPEN;

    log('emit ready');
    this.emit('ready', {
      network: this,
    });
  }

  @synchronized
  async close() {
    invariant(this._lifecycleState === LifecycleState.OPEN);

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

    await replicator.connect({
      peerId: this.peerId,
      onConnectionOpen: this._onConnectionOpen.bind(this),
      onConnectionClosed: this._onConnectionClosed.bind(this),
      getContainingSpaceForDocument: this._params.getContainingSpaceForDocument,
    });
  }

  @synchronized
  async removeReplicator(replicator: EchoReplicator) {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this._replicators.has(replicator));
    await replicator.disconnect();
  }

  async shouldAdvertize(peerId: PeerId, params: ShouldAdvertizeParams): Promise<boolean> {
    const connection = this._connections.get(peerId);
    if (!connection) {
      return false;
    }

    return connection.connection.shouldAdvertize(params);
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

          this.emit('message', value);
        }
      } catch (err) {
        if (connectionEntry.isOpen) {
          log.catch(err);
        }
      }
    });

    log('emit peer-candidate', { peerId: connection.peerId });
    this.emit('peer-candidate', {
      peerId: connection.peerId as PeerId,
      peerMetadata: {
        // TODO(dmaretskyi): Refactor this.
        dxos_peerSource: 'EchoNetworkAdapter',
      } as any,
    });
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
}

type ConnectionEntry = {
  connection: ReplicatorConnection;
  reader: ReadableStreamDefaultReader<Message>;
  writer: WritableStreamDefaultWriter<Message>;
  isOpen: boolean;
};
