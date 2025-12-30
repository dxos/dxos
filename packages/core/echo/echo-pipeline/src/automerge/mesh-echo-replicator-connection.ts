//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import { cbor } from '@automerge/automerge-repo';

import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { AutomergeProtocolMessage } from '@dxos/protocols';
import { AutomergeReplicator, type AutomergeReplicatorFactory } from '@dxos/teleport-extension-automerge-replicator';

import type { ReplicatorConnection, ShouldAdvertiseProps, ShouldSyncCollectionProps } from './echo-replicator';

const DEFAULT_FACTORY: AutomergeReplicatorFactory = (params) => new AutomergeReplicator(...params);

export type MeshReplicatorConnectionProps = {
  ownPeerId: string;
  onRemoteConnected: () => void;
  onRemoteDisconnected: () => void;
  shouldAdvertise: (params: ShouldAdvertiseProps) => Promise<boolean>;
  shouldSyncCollection: (params: ShouldSyncCollectionProps) => boolean;
  replicatorFactory?: AutomergeReplicatorFactory;
};

export class MeshReplicatorConnection extends Resource implements ReplicatorConnection {
  public readable: ReadableStream<AutomergeProtocolMessage>;
  public writable: WritableStream<AutomergeProtocolMessage>;
  public remoteDeviceKey: PublicKey | null = null;

  public readonly replicatorExtension: AutomergeReplicator;

  private _remotePeerId: string | null = null;
  private _isEnabled = false;

  constructor(private readonly _params: MeshReplicatorConnectionProps) {
    super();

    let readableStreamController!: ReadableStreamDefaultController<AutomergeProtocolMessage>;
    this.readable = new ReadableStream<AutomergeProtocolMessage>({
      start: (controller) => {
        readableStreamController = controller;
        this._ctx.onDispose(() => controller.close());
      },
    });

    this.writable = new WritableStream<AutomergeProtocolMessage>({
      write: async (message: AutomergeProtocolMessage, controller) => {
        invariant(this._isEnabled, 'Writing to a disabled connection');
        try {
          logSendSync(message);
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
          // Note: We store only one enabled extension per peer.
          //       There can be a case where two connected peers have more than one teleport connection between them
          //       and each of them uses different teleport connections to send messages.
          //       It works because we receive messages from all teleport connections and Automerge Repo dedup them.
          // TODO(mykola): Use only one teleport connection per peer.

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
          const message = cbor.decode(payload) as AutomergeProtocolMessage;
          // Note: automerge Repo dedup messages.
          readableStreamController.enqueue(message);
        },
        onClose: async () => {
          this._disconnectIfEnabled();
        },
      },
    ]);
  }

  private _disconnectIfEnabled(): void {
    if (this._isEnabled) {
      this._params.onRemoteDisconnected();
    }
  }

  get peerId(): string {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    return this._remotePeerId;
  }

  get isEnabled() {
    return this._isEnabled;
  }

  get bundleSyncEnabled(): boolean {
    return false;
  }

  async shouldAdvertise(params: ShouldAdvertiseProps): Promise<boolean> {
    return this._params.shouldAdvertise(params);
  }

  shouldSyncCollection(params: ShouldSyncCollectionProps): boolean {
    return this._params.shouldSyncCollection(params);
  }

  /**
   * Start exchanging messages with the remote peer.
   * Call after the remote peer has connected.
   */
  enable(): void {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    this._isEnabled = true;
  }

  /**
   * Stop exchanging messages with the remote peer.
   */
  disable(): void {
    this._isEnabled = false;
  }
}

const logSendSync = (message: AutomergeProtocolMessage) => {
  log('sendSyncMessage', () => {
    const decodedSyncMessage = message.type === 'sync' && message.data ? A.decodeSyncMessage(message.data) : undefined;
    return {
      sync: decodedSyncMessage && {
        headsLength: decodedSyncMessage.heads.length,
        requesting: decodedSyncMessage.need.length > 0,
        sendingChanges: decodedSyncMessage.changes.length > 0,
      },
      type: message.type,
      from: message.senderId,
      to: message.targetId,
    };
  });
};
