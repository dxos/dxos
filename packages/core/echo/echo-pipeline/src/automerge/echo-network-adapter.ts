import { Trigger, synchronized } from '@dxos/async';
import { Message, NetworkAdapter, PeerId, PeerMetadata } from '@dxos/automerge/automerge-repo';
import { EchoReplicator, ReplicatorConnection, ShouldAdvertizeParams } from './echo-replicator';
import { invariant } from '@dxos/invariant';
import { LifecycleState } from '@dxos/context';
import { log } from '@dxos/log';

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

  override connect(peerId: PeerId, peerMetadata?: PeerMetadata | undefined): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
    this._connected.wake();
  }

  override send(message: Message): void {
    const connection = this._connections.get(message.targetId);
    if (!connection) {
      throw new Error('Connection not found.');
    }

    // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
    connection.writer.write(message);
  }

  override disconnect(): void {
    // No-op
  }

  @synchronized
  async open() {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._lifecycleState = LifecycleState.OPEN;

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
    invariant(this.peerId);
    invariant(!this._replicators.has(replicator));

    await replicator.connect({
      peerId: this.peerId,
      onConnectionOpen: this._onConnectionOpen.bind(this),
      onConnectionClosed: this._onConnectionClosed.bind(this),
    });
  }

  @synchronized
  async removeReplicator(replicator: EchoReplicator) {
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
    invariant(!this._connections.has(connection.peerId as PeerId));
    const reader = connection.readable.getReader();
    const writer = connection.writable.getWriter();
    this._connections.set(connection.peerId as PeerId, { connection, reader, writer });

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
        log.catch(err);
      }
    });

    this.emit('peer-candidate', {
      peerId: connection.peerId as PeerId,
      peerMetadata: {
        // TODO(dmaretskyi): Refactor this.
        dxos_peerSource: 'EchoNetworkAdapter',
      } as any,
    });
  }

  private _onConnectionClosed(connection: ReplicatorConnection) {
    const entry = this._connections.get(connection.peerId as PeerId);
    invariant(entry);

    this.emit('peer-disconnected', { peerId: connection.peerId as PeerId });

    void entry.reader.cancel().catch((err) => log.catch(err));
    void entry.writer.abort();

    this._connections.delete(connection.peerId as PeerId);
  }
}

type ConnectionEntry = {
  connection: ReplicatorConnection;
  reader: ReadableStreamDefaultReader<Message>;
  writer: WritableStreamDefaultWriter<Message>;
};
