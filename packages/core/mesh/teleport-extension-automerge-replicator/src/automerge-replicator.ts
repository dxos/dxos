//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import {
  type PeerInfo,
  type AutomergeReplicatorService,
  type SyncMessage,
} from '@dxos/protocols/proto/dxos/mesh/teleport/automerge';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { type ExtensionContext, type TeleportExtension } from '@dxos/teleport';

export type AutomergeReplicatorParams = {
  /**
   * The peerId of local automerge repo.
   */
  peerId: string;
};

export type AutomergeReplicatorCallbacks = {
  /**
   * Callback to be called when remote peer starts replication.
   */
  onStartReplication?: (info: PeerInfo) => Promise<void>;

  /**
   * Callback to be called when remote peer stops replication.
   */
  onStopReplication?: (info: PeerInfo) => Promise<void>;

  /**
   * Callback to be called when a sync message is received.
   */
  onSyncMessage?: (message: SyncMessage) => Promise<void>;

  /**
   * Callback to be called when the extension is closed.
   */
  onClose?: (err?: Error) => Promise<void>;
};

/**
 * Sends automerge messages between two peers for a single teleport session.
 */
export class AutomergeReplicator implements TeleportExtension {
  private readonly _opened = new Trigger();
  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  constructor(
    private readonly _params: AutomergeReplicatorParams,
    private readonly _callbacks: AutomergeReplicatorCallbacks = {},
  ) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });

    this._rpc = createProtoRpcPeer<ServiceBundle, ServiceBundle>({
      requested: {
        AutomergeReplicatorService: schema.getService('dxos.mesh.teleport.automerge.AutomergeReplicatorService'),
      },
      exposed: {
        AutomergeReplicatorService: schema.getService('dxos.mesh.teleport.automerge.AutomergeReplicatorService'),
      },
      handlers: {
        AutomergeReplicatorService: {
          startReplication: async (info: PeerInfo): Promise<void> => {
            log('startReplication', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, info });
            await this._callbacks.onStartReplication?.(info);
          },
          stopReplication: async (info: PeerInfo): Promise<void> => {
            log('startReplication', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, info });
            await this._callbacks.onStopReplication?.(info);
          },
          sendSyncMessage: async (message: SyncMessage): Promise<void> => {
            log('sendSyncMessage', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, message });
            await this._callbacks.onSyncMessage?.(message);
          },
        },
      },
      port: await context.createPort('rpc', { contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"' }),
    });
    await this._rpc.open();
    // Announce to remote peer that we are ready to start replication.
    await this._rpc.rpc.AutomergeReplicatorService.startReplication({ id: this._params.peerId });
    this._opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    this._opened.reset();
    await this._rpc?.rpc.AutomergeReplicatorService.stopReplication({ id: this._params.peerId });
    await this._rpc?.close();
    this._rpc = undefined;
    await this._callbacks.onClose?.(err);
  }

  async onAbort(err?: Error): Promise<void> {
    log('abort', { err });
    try {
      await this._rpc?.rpc.AutomergeReplicatorService.stopReplication({ id: this._params.peerId });
      await this._rpc?.abort();
    } catch (err) {
      log.catch(err);
    } finally {
      await this._callbacks.onClose?.(err);
    }
  }

  async sendSyncMessage(message: SyncMessage) {
    await this._opened.wait();
    invariant(this._rpc, 'RPC not initialized');
    await this._rpc.rpc.AutomergeReplicatorService.sendSyncMessage(message);
  }
}

type ServiceBundle = {
  AutomergeReplicatorService: AutomergeReplicatorService;
};
