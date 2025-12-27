//
// Copyright 2024 DXOS.org
//

import type { CollectionId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type AutomergeReplicator,
  type AutomergeReplicatorFactory,
} from '@dxos/teleport-extension-automerge-replicator';
import { ComplexSet, defaultMap } from '@dxos/util';

import { createIdFromSpaceKey } from '../common/space-id';

import { type EchoReplicator, type EchoReplicatorContext, type ShouldAdvertiseProps } from './echo-replicator';
import { MeshReplicatorConnection } from './mesh-echo-replicator-connection';
import { getSpaceIdFromCollectionId } from './space-collection';

// TODO(dmaretskyi): Move out of @dxos/echo-pipeline.

/**
 * Used to replicate with other peers over the network.
 */
export class MeshEchoReplicator implements EchoReplicator {
  /**
   * We might have multiple connections open with a peer (one per space), but there'll be only one enabled
   * connection at any given moment, because there's a single repo for all the spaces.
   * When a connection closes (space was closed) it gets removed from the list and the next connection
   * in the line gets enabled.
   */
  private readonly _connectionsPerPeer = new Map<string, MeshReplicatorConnection[]>();
  /**
   * A set of all connections (enabled and disabled).
   */
  private readonly _connections = new Set<MeshReplicatorConnection>();

  /**
   * spaceId -> deviceKey[]
   */
  private readonly _authorizedDevices = new Map<SpaceId, ComplexSet<PublicKey>>();

  private _context: EchoReplicatorContext | null = null;

  async connect(context: EchoReplicatorContext): Promise<void> {
    this._context = context;
  }

  async disconnect(): Promise<void> {
    for (const connection of this._connections) {
      if (connection.isEnabled) {
        this._context?.onConnectionClosed(connection);
      }
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

        const existingConnections = this._connectionsPerPeer.get(connection.peerId);
        if (existingConnections?.length) {
          const enabledConnection = existingConnections[0];
          this._context.onConnectionAuthScopeChanged(enabledConnection);
          existingConnections.push(connection);
        } else {
          this._connectionsPerPeer.set(connection.peerId, [connection]);
          this._context.onConnectionOpen(connection);
          connection.enable();
        }
      },
      onRemoteDisconnected: async () => {
        log('onRemoteDisconnected', { peerId: connection.peerId });

        this._connections.delete(connection);

        const existingConnections = this._connectionsPerPeer.get(connection.peerId) ?? [];

        const index = existingConnections.indexOf(connection);
        if (index < 0) {
          log.warn('disconnected connection not found', { peerId: connection.peerId });
          return;
        }

        existingConnections.splice(index, 1);

        if (connection.isEnabled) {
          this._context?.onConnectionClosed(connection);
          connection.disable();

          // Promote the next connection to enabled
          if (existingConnections.length > 0) {
            this._context?.onConnectionOpen(existingConnections[0]);
            existingConnections[0].enable();
          }
        }
      },
      shouldAdvertise: async (params: ShouldAdvertiseProps) => {
        log('shouldAdvertise', { peerId: connection.peerId, documentId: params.documentId });
        invariant(this._context);
        try {
          const spaceKey = await this._context.getContainingSpaceForDocument(params.documentId);
          if (!spaceKey) {
            const remoteDocumentExists = await this._context.isDocumentInRemoteCollection({
              documentId: params.documentId,
              peerId: connection.peerId,
            });
            log('document not found locally for share policy check', {
              peerId: connection.peerId,
              documentId: params.documentId,
              acceptDocument: remoteDocumentExists,
            });

            // If a document is not present locally return true if another peer claims to have it.
            // Simply returning true will add the peer to "generous peers list" for this document which will
            // start replication of the document after we receive, even if the peer is not in the corresponding space.
            return remoteDocumentExists;
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
        const spaceId = getSpaceIdFromCollectionId(collectionId as CollectionId);

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

  async authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey): Promise<void> {
    log('authorizeDevice', { spaceKey, deviceKey });
    const spaceId = await createIdFromSpaceKey(spaceKey);
    defaultMap(this._authorizedDevices, spaceId, () => new ComplexSet(PublicKey.hash)).add(deviceKey);
    for (const connection of this._connections) {
      if (connection.isEnabled && connection.remoteDeviceKey && connection.remoteDeviceKey.equals(deviceKey)) {
        if (this._connectionsPerPeer.has(connection.peerId)) {
          this._context?.onConnectionAuthScopeChanged(connection);
        }
      }
    }
  }
}
