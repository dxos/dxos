//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { GossipMessage, GossipService } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';

export type GossipCallbacks = {
  /**
   * Callback to be called when a new announce is received.
   */
  onAnnounce?: (message: GossipMessage) => Promise<void>;

  /**
   * Callback to be called when the extension is closed.
   */
  onClose?: (err?: Error) => Promise<void>;
};

/**
 * Sends announces between two peers for a single teleport session.
 */
export class GossipExtension implements TeleportExtension {
  private readonly _opened = new Trigger();
  private _closed = false;

  private _sendInterval?: NodeJS.Timeout;

  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  constructor(private readonly _callbacks: GossipCallbacks = {}) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });

    this._rpc = createProtoRpcPeer<ServiceBundle, ServiceBundle>({
      requested: {
        GossipService: schema.getService('dxos.mesh.teleport.gossip.GossipService'),
      },
      exposed: {
        GossipService: schema.getService('dxos.mesh.teleport.gossip.GossipService'),
      },
      handlers: {
        GossipService: {
          announce: async (message: GossipMessage) => {
            log('received announce', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId, message });
            await this._callbacks.onAnnounce?.(message);
          },
        },
      },
      port: context.createPort('rpc', { contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"' }),
    });
    await this._rpc.open();
    this._opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    log('close', { err });
    await this._rpc?.close();
    this._sendInterval && clearInterval(this._sendInterval);
    await this._callbacks.onClose?.(err);
    this._closed = true;
  }

  async sendAnnounce(message: GossipMessage) {
    if (this._closed) {
      return;
    }
    await this._opened.wait();
    invariant(this._rpc, 'RPC not initialized');
    await this._rpc.rpc.GossipService.announce(message);
  }
}

type ServiceBundle = {
  GossipService: GossipService;
};
