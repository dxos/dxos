//
// Copyright 2024 DXOS.org
//

import { type Message, NetworkAdapter, type PeerId, type PeerMetadata } from '@automerge/automerge-repo';

import { Trigger, synchronized } from '@dxos/async';
import { type Context, LifecycleState } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { AutomergeProtocolMessage } from '@dxos/protocols';

import { createIdFromSpaceKey } from '../common/space-id';
import { type AutomergeReplicator, type AutomergeReplicatorConnection } from './echo-replicator';

export interface NetworkDataMonitor {
  recordPeerConnected(peerId: string): void;
  recordPeerDisconnected(peerId: string): void;
  recordMessageSent(message: Message, duration: number): void;
  recordMessageReceived(message: Message): void;
  recordMessageSendingFailed(message: Message): void;
}

export type EchoNetworkAdapterProps = {
  getContainingSpaceForDocument: (documentId: string) => Promise<PublicKey | null>;
  monitor?: NetworkDataMonitor;
};

type ConnectionEntry = {
  isOpen: boolean;
  connection: AutomergeReplicatorConnection;
  reader: ReadableStreamDefaultReader<AutomergeProtocolMessage>;
  writer: WritableStreamDefaultWriter<AutomergeProtocolMessage>;
};

/**
 * {@link NetworkAdapter} that bridges DXOS replicators (e.g. edge replicator, mesh replicator)
 * to automerge-repo's {@link Repo}.
 *
 * Under the Subduction transport model this adapter is a byte tunnel: it forwards all
 * `subduction-connection` frames between the Repo and the active replicator connections.
 * The legacy classical-sync / collection-sync / bundle-sync plumbing was removed.
 */
export class EchoNetworkAdapter extends NetworkAdapter {
  private readonly _replicators = new Set<AutomergeReplicator>();
  /**
   * Remote peer id -> connection.
   */
  private readonly _connections = new Map<PeerId, ConnectionEntry>();
  private _lifecycleState: LifecycleState = LifecycleState.CLOSED;
  private readonly _connected = new Trigger();
  private readonly _ready = new Trigger();

  constructor(private readonly _params: EchoNetworkAdapterProps) {
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
    // No-op.
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

  @synchronized
  async addReplicator(ctx: Context, replicator: AutomergeReplicator): Promise<void> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this.peerId);
    invariant(!this._replicators.has(replicator));

    this._replicators.add(replicator);
    await replicator.connect(ctx, {
      peerId: this.peerId,
      onConnectionOpen: this._onConnectionOpen.bind(this),
      onConnectionClosed: this._onConnectionClosed.bind(this),
      getContainingSpaceForDocument: this._params.getContainingSpaceForDocument,
      getContainingSpaceIdForDocument: async (documentId) => {
        const key = await this._params.getContainingSpaceForDocument(documentId);
        return key ? createIdFromSpaceKey(key) : null;
      },
    });
  }

  @synchronized
  async removeReplicator(replicator: AutomergeReplicator): Promise<void> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(this._replicators.has(replicator));
    await replicator.disconnect();
    this._replicators.delete(replicator);
  }

  private _send(message: Message): void {
    const connectionEntry = this._connections.get(message.targetId);
    if (!connectionEntry) {
      throw new Error('Connection not found.');
    }

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

  private _onConnectionOpen(connection: AutomergeReplicatorConnection): void {
    log('connection opened', { peerId: connection.peerId });
    invariant(!this._connections.has(connection.peerId as PeerId));
    const connectionEntry: ConnectionEntry = {
      isOpen: true,
      connection,
      reader: connection.readable.getReader(),
      writer: connection.writable.getWriter(),
    };

    this._connections.set(connection.peerId as PeerId, connectionEntry);

    // Read inbound messages and forward to the Repo.
    queueMicrotask(async () => {
      try {
        while (true) {
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

  private _onMessage(_connectionEntry: ConnectionEntry, message: Message): void {
    this.emit('message', message);
    this._params.monitor?.recordMessageReceived(message);
  }

  private _onConnectionClosed(connection: AutomergeReplicatorConnection): void {
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

  private _emitPeerCandidate(connection: AutomergeReplicatorConnection): void {
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
