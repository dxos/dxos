//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type * as TeleportAutomergeReplicator from '@dxos/teleport-extension-automerge-replicator';

import { type AutomergeReplicator, type AutomergeReplicatorContext } from './echo-replicator';
import { MeshReplicatorConnection } from './mesh-echo-replicator-connection';

// TODO(dmaretskyi): Move out of @dxos/echo-pipeline.

/**
 * Peer-to-peer mesh replicator — a subduction byte tunnel over Teleport.
 *
 * Under Subduction, per-document / per-collection share policies are handled inside the
 * subduction protocol itself via the signer and discovery policy. This replicator only
 * carries bytes; it no longer performs device-scoped share-policy checks.
 *
 * TODO(mykola): Remove {@link authorizeDevice} once the subduction policy layer fully
 * replaces the device-key authorization flow.
 */
export class MeshEchoReplicator implements AutomergeReplicator {
  /**
   * We might have multiple connections open with a peer (one per space), but there'll be only one enabled
   * connection at any given moment, because there's a single repo for all the spaces.
   */
  private readonly _connectionsPerPeer = new Map<string, MeshReplicatorConnection[]>();
  private readonly _connections = new Set<MeshReplicatorConnection>();

  private _context: AutomergeReplicatorContext | null = null;

  async connect(_ctx: Context, context: AutomergeReplicatorContext): Promise<void> {
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

  createExtension(
    extensionFactory?: TeleportAutomergeReplicator.AutomergeReplicatorFactory,
  ): TeleportAutomergeReplicator.AutomergeReplicator {
    invariant(this._context);

    const connection: MeshReplicatorConnection = new MeshReplicatorConnection({
      ownPeerId: this._context.peerId,
      replicatorFactory: extensionFactory,
      onRemoteConnected: async () => {
        log('onRemoteConnected', { peerId: connection.peerId });
        invariant(this._context);

        const existingConnections = this._connectionsPerPeer.get(connection.peerId);
        if (existingConnections?.length) {
          // A second (duplicate) teleport channel to the same peer — queue it but don't enable.
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

          // Promote the next connection to enabled.
          if (existingConnections.length > 0) {
            this._context?.onConnectionOpen(existingConnections[0]);
            existingConnections[0].enable();
          }
        }
      },
    });
    this._connections.add(connection);

    return connection.replicatorExtension;
  }

  /**
   * @deprecated No-op under Subduction — device authorization is handled inside the
   * subduction protocol layer. Kept for API compatibility until callers migrate.
   */
  async authorizeDevice(_spaceKey: PublicKey, _deviceKey: PublicKey): Promise<void> {
    // No-op.
  }
}
