//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { PeerState, PresenceService } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';

export type PresenceCallbacks = {
  /**
   * Callback to be called when a new announce is received.
   */
  onAnnounce?: (peerState: PeerState) => Promise<void>;

  /**
   * Callback to be called when the extension is closed.
   */
  onClose?: (err?: Error) => Promise<void>;
};

/**
 * Sends presence announces between two peers for a single teleport session.
 */
export class PresenceExtension implements TeleportExtension {
  private readonly _opened = new Trigger();
  private _closed = false;

  private _sendInterval?: NodeJS.Timeout;

  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  constructor(private readonly _callbacks: PresenceCallbacks = {}) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });

    this._rpc = createProtoRpcPeer<ServiceBundle, ServiceBundle>({
      requested: {
        PresenceService: schema.getService('dxos.mesh.teleport.presence.PresenceService')
      },
      exposed: {
        PresenceService: schema.getService('dxos.mesh.teleport.presence.PresenceService')
      },
      handlers: {
        PresenceService: {
          announce: async (peerState: PeerState) => await this._callbacks.onAnnounce?.(peerState)
        }
      },
      port: context.createPort('rpc', { contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"' })
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

  async sendAnnounce(peerState: PeerState) {
    if (this._closed) {
      return;
    }
    await this._opened.wait();
    assert(this._rpc, 'RPC not initialized');
    await this._rpc.rpc.PresenceService.announce(peerState);
  }
}

type ServiceBundle = {
  PresenceService: PresenceService;
};
