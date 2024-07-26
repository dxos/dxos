//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type AutomergeReplicator,
  type AutomergeReplicatorFactory,
} from '@dxos/teleport-extension-automerge-replicator';
import { ComplexSet, defaultMap } from '@dxos/util';

import { type EchoReplicator, type EchoReplicatorContext, type ShouldAdvertiseParams } from './echo-replicator';
import { MeshReplicatorConnection } from './mesh-echo-replicator-connection';
import { getSpaceIdFromCollectionId } from './space-collection';
import { createIdFromSpaceKey } from '../space';

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
   * spaceId -> deviceKey[]
   */
  private readonly _authorizedDevices = new Map<SpaceId, ComplexSet<PublicKey>>();

  private _context: EchoReplicatorContext | null = null;

  async connect(context: EchoReplicatorContext): Promise<void> {
    this._context = context;
  }

  async disconnect() {
    for (const connection of this._connectionsPerPeer.values()) {
      this._context?.onConnectionClosed(connection);
    }
    for (const connection of this._connections) {
      await connection.close();
    }
    this._connections.clear();
    this._connectionsPerPeer.clear();

    this._context = null;
  }

  createExtension(extensionFactory?: AutomergeReplicatorFactory): AutomergeReplicator {
    invariant(this._context);

    const connection: MeshReplicatorConnection = new MeshReplicatorConnection({
      ownPeerId: this._context.peerId,
      replicatorFactory: extensionFactory,
      onRemoteConnected: async () => {
        log('onRemoteConnected', { peerId: connection.peerId });
        invariant(this._context);

        if (this._connectionsPerPeer.has(connection.peerId)) {
          this._context.onConnectionAuthScopeChanged(connection);
        } else {
          this._connectionsPerPeer.set(connection.peerId, connection);
          this._context.onConnectionOpen(connection);
          connection.enable();
        }
      },
      onRemoteDisconnected: async () => {
        log('onRemoteDisconnected', { peerId: connection.peerId });
        this._context?.onConnectionClosed(connection);
        this._connectionsPerPeer.delete(connection.peerId);
        connection.disable();
        this._connections.delete(connection);
      },
      shouldAdvertise: async (params: ShouldAdvertiseParams) => {
        log('shouldAdvertise', { peerId: connection.peerId, documentId: params.documentId });
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

          const spaceId = await createIdFromSpaceKey(spaceKey);

          const authorizedDevices = this._authorizedDevices.get(spaceId);

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
      shouldSyncCollection: ({ collectionId }) => {
        const spaceId = getSpaceIdFromCollectionId(collectionId);

        const authorizedDevices = this._authorizedDevices.get(spaceId);

        if (!connection.remoteDeviceKey) {
          log('device key not found for collection sync check', {
            peerId: connection.peerId,
            collectionId,
          });
          return false;
        }

        const isAuthorized = authorizedDevices?.has(connection.remoteDeviceKey) ?? false;
        return isAuthorized;
      },
    });
    this._connections.add(connection);

    return connection.replicatorExtension;
  }

  async authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey) {
    log('authorizeDevice', { spaceKey, deviceKey });
    const spaceId = await createIdFromSpaceKey(spaceKey);
    defaultMap(this._authorizedDevices, spaceId, () => new ComplexSet(PublicKey.hash)).add(deviceKey);
    for (const connection of this._connections) {
      if (connection.remoteDeviceKey && connection.remoteDeviceKey.equals(deviceKey)) {
        if (this._connectionsPerPeer.has(connection.peerId)) {
          this._context?.onConnectionAuthScopeChanged(connection);
        }
      }
    }
  }
}
