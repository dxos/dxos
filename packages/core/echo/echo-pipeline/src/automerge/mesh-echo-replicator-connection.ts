//
// Copyright 2024 DXOS.org
//

import { cbor, type Message } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AutomergeReplicator, type AutomergeReplicatorFactory } from '@dxos/teleport-extension-automerge-replicator';

import type { ReplicatorConnection, ShouldAdvertiseParams, ShouldSyncCollectionParams } from './echo-replicator';

const DEFAULT_FACTORY: AutomergeReplicatorFactory = (params) => new AutomergeReplicator(...params);

export type MeshReplicatorConnectionParams = {
  ownPeerId: string;
  onRemoteConnected: () => void;
  onRemoteDisconnected: () => void;
  shouldAdvertise: (params: ShouldAdvertiseParams) => Promise<boolean>;
  shouldSyncCollection: (params: ShouldSyncCollectionParams) => boolean;
  replicatorFactory?: AutomergeReplicatorFactory;
};

export class MeshReplicatorConnection extends Resource implements ReplicatorConnection {
  public readable: ReadableStream<Message>;
  public writable: WritableStream<Message>;
  public remoteDeviceKey: PublicKey | null = null;

  public readonly replicatorExtension: AutomergeReplicator;

  private _remotePeerId: string | null = null;
  private _isEnabled = false;

  constructor(private readonly _params: MeshReplicatorConnectionParams) {
    super();

    let readableStreamController!: ReadableStreamDefaultController<Message>;
    this.readable = new ReadableStream<Message>({
      start: (controller) => {
        readableStreamController = controller;
        this._ctx.onDispose(() => controller.close());
      },
    });

    this.writable = new WritableStream<Message>({
      write: async (message: Message, controller) => {
        invariant(this._isEnabled, 'Writing to a disabled connection');
        try {
          await this.replicatorExtension.sendSyncMessage({ payload: cbor.encode(message) });
        } catch (err) {
          controller.error(err);
          this._disconnectIfEnabled();
        }
      },
    });

    const createAutomergeReplicator = this._params.replicatorFactory ?? DEFAULT_FACTORY;
    this.replicatorExtension = createAutomergeReplicator([
      {
        peerId: this._params.ownPeerId,
      },
      {
        onStartReplication: async (info, remotePeerId /** Teleport ID */) => {
          // Note: We store only one extension per peer.
          //       There can be a case where two connected peers have more than one teleport connection between them
          //       and each of them uses different teleport connections to send messages.
          //       It works because we receive messages from all teleport connections and Automerge Repo dedup them.
          // TODO(mykola): Use only one teleport connection per peer.

          // TODO(dmaretskyi): Critical bug.
          // - two peers get connected via swarm 1
          // - they get connected via swarm 2
          // - swarm 1 gets disconnected
          // - automerge repo thinks that peer 2 got disconnected even though swarm 2 is still active

          this.remoteDeviceKey = remotePeerId;

          // Set automerge id.
          this._remotePeerId = info.id;

          log('onStartReplication', { id: info.id, thisPeerId: this.peerId, remotePeerId: remotePeerId.toHex() });

          this._params.onRemoteConnected();
        },
        onSyncMessage: async ({ payload }) => {
          if (!this._isEnabled) {
            return;
          }
          const message = cbor.decode(payload) as Message;
          // Note: automerge Repo dedup messages.
          readableStreamController.enqueue(message);
        },
        onClose: async () => {
          this._disconnectIfEnabled();
        },
      },
    ]);
  }

  private _disconnectIfEnabled() {
    if (this._isEnabled) {
      this._params.onRemoteDisconnected();
    }
  }

  get peerId(): string {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    return this._remotePeerId;
  }

  async shouldAdvertise(params: ShouldAdvertiseParams): Promise<boolean> {
    return this._params.shouldAdvertise(params);
  }

  shouldSyncCollection(params: ShouldSyncCollectionParams): boolean {
    return this._params.shouldSyncCollection(params);
  }

  /**
   * Start exchanging messages with the remote peer.
   * Call after the remote peer has connected.
   */
  enable() {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    this._isEnabled = true;
  }

  /**
   * Stop exchanging messages with the remote peer.
   */
  disable() {
    this._isEnabled = false;
  }
}
