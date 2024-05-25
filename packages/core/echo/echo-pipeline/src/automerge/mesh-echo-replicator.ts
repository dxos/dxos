//
// Copyright 2024 DXOS.org
//

import { type Message, cbor } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AutomergeReplicator } from '@dxos/teleport-extension-automerge-replicator';
import { ComplexMap, ComplexSet, defaultMap } from '@dxos/util';

import {
  type EchoReplicator,
  type EchoReplicatorContext,
  type ReplicatorConnection,
  type ShouldAdvertizeParams,
} from './echo-replicator';

// TODO(dmaretskyi): Move out of @dxos/echo-pipeline.

/**
 * Used to replicate with other peers over the network.
 */
export class MeshEchoReplicator implements EchoReplicator {
  private readonly _connections = new Set<MeshReplicatorConnection>();
  /**
   * Using automerge peerId as a key.
   */
  private readonly _connectionsPerPeer = new Map<string, MeshReplicatorConnection>();

  /**
   * spaceKey -> deviceKey[]
   */
  private readonly _authorizedDevices = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  private _context: EchoReplicatorContext | null = null;

  async connect(context: EchoReplicatorContext): Promise<void> {
    this._context = context;
  }

  async disconnect() {
    for (const connection of this._connections) {
      await connection.close();
    }
    this._connections.clear();
    this._connectionsPerPeer.clear();

    this._context = null;
  }

  createExtension(): AutomergeReplicator {
    invariant(this._context);

    const connection: MeshReplicatorConnection = new MeshReplicatorConnection({
      ownPeerId: this._context.peerId,
      onRemoteConnected: async () => {
        log('onRemoteConnected', { peerId: connection.peerId });
        invariant(this._context);

        if (!this._connectionsPerPeer.has(connection.peerId)) {
          this._connectionsPerPeer.set(connection.peerId, connection);
          await connection.enable();
          this._context.onConnectionOpen(connection);
        }
      },
      onRemoteDisconnected: async () => {
        log('onRemoteDisconnected', { peerId: connection.peerId });
        this._context?.onConnectionClosed(connection);
        await connection.disable();
        this._connectionsPerPeer.delete(connection.peerId);
        this._connections.delete(connection);
      },
      shouldAdvertize: async (params: ShouldAdvertizeParams) => {
        log('shouldAdvertize', { peerId: connection.peerId, documentId: params.documentId });
        invariant(this._context);
        try {
          const spaceKey = await this._context.getContainingSpaceForDocument(params.documentId);
          if (!spaceKey) {
            log('space key not found for share policy check', {
              peerId: connection.peerId,
              documentId: params.documentId,
            });
            return false;
          }

          const authorizedDevices = this._authorizedDevices.get(spaceKey);

          if (!connection.remoteDeviceKey) {
            log('device key not found for share policy check', {
              peerId: connection.peerId,
              documentId: params.documentId,
            });
            return false;
          }

          const isAuthorized = authorizedDevices?.has(connection.remoteDeviceKey) ?? false;
          log('share policy check', {
            localPeer: this._context.peerId,
            remotePeer: connection.peerId,
            documentId: params.documentId,
            deviceKey: connection.remoteDeviceKey,
            spaceKey,
            isAuthorized,
          });
          return isAuthorized;
        } catch (err) {
          log.catch(err);
          return false;
        }
      },
    });
    this._connections.add(connection);

    return connection.replicatorExtension;
  }

  authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey) {
    log('authorizeDevice', { spaceKey, deviceKey });
    defaultMap(this._authorizedDevices, spaceKey, () => new ComplexSet(PublicKey.hash)).add(deviceKey);
  }
}

type MeshReplicatorConnectionParams = {
  ownPeerId: string;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  shouldAdvertize: (params: ShouldAdvertizeParams) => Promise<boolean>;
};

class MeshReplicatorConnection extends Resource implements ReplicatorConnection {
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
        // TODO(dmaretskyi): Show we block on RPC completing here?
        this.replicatorExtension.sendSyncMessage({ payload: cbor.encode(message) }).catch((err) => {
          controller.error(err);
        });
      },
    });

    this.replicatorExtension = new AutomergeReplicator(
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

          await this._params.onRemoteConnected();
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
          if (!this._isEnabled) {
            return;
          }
          await this._params.onRemoteDisconnected();
        },
      },
    );
  }

  get peerId(): string {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    return this._remotePeerId;
  }

  async shouldAdvertize(params: ShouldAdvertizeParams): Promise<boolean> {
    return this._params.shouldAdvertize(params);
  }

  /**
   * Start exchanging messages with the remote peer.
   * Call after the remote peer has connected.
   */
  async enable() {
    invariant(this._remotePeerId != null, 'Remote peer has not connected yet.');
    this._isEnabled = true;
  }

  /**
   * Stop exchanging messages with the remote peer.
   */
  async disable() {
    this._isEnabled = false;
  }
}
