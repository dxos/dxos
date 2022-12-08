//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { PeerState, PresenceService } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';

export type PresenceParams = {
  /**
   * List of direct connections for current peer.
   */
  connections: PublicKey[];

  /**
   * Interval between announces.
   */
  announceInterval: number;
};

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
  private readonly opened = new Trigger();
  public readonly closed = new Trigger();

  private _sendInterval?: NodeJS.Timeout;

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;

  constructor(private readonly _params: PresenceParams, private readonly _callbacks: PresenceCallbacks = {}) {}

  async onOpen(context: ExtensionContext): Promise<void> {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });
    this._extensionContext = context;

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
    await this._sendAnnounce();
    this._sendInterval = setInterval(() => this._sendAnnounce(), this._params.announceInterval);
    this.opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    log('close', { err });
    await this._rpc?.close();
    this._sendInterval && clearInterval(this._sendInterval);
    await this._callbacks.onClose?.(err);
    this.closed.wake();
  }

  async setConnections(connections: PublicKey[]) {
    this._params.connections = connections;
    await this._sendAnnounce();
  }

  async sendAnnounce(peerState: PeerState) {
    await this.opened.wait();
    assert(this._rpc, 'RPC not initialized');
    await this._rpc.rpc.PresenceService.announce(peerState);
  }

  private async _sendAnnounce() {
    await this._rpc?.rpc.PresenceService.announce({
      peerId: this._extensionContext!.localPeerId,
      connections: this._params.connections,
      messageId: PublicKey.random(),
      timestamp: new Date()
    });
  }
}

type ServiceBundle = {
  PresenceService: PresenceService;
};
