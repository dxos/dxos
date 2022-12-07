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
import { ComplexSet } from '@dxos/util';

export type PresenceParams = {
  connections: PublicKey[];
  resendAnnounce: number;
  onAnnounce: (peerState: PeerState) => Promise<void>;
};

/**
 * Sending presence pings between a set peers for a single teleport session.
 */
export class PresenceExtension implements TeleportExtension {
  public readonly opened = new Trigger();
  public readonly closed = new Trigger();

  private readonly _sentAnnounces = new ComplexSet<PublicKey>(PublicKey.hash); // TODO(mykola): Memory leak, never cleaned up?
  private _sendInterval?: NodeJS.Timeout;

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;

  constructor(private readonly _params: PresenceParams) {}

  setConnections(connections: PublicKey[]) {
    this._params.connections = connections;
  }

  async sendAnnounce(peerState: PeerState) {
    await this.opened.wait();
    assert(this._rpc, 'RPC not initialized');
    if (this._sentAnnounces.has(peerState.messageId)) {
      return;
    }
    this._sentAnnounces.add(peerState.messageId);
    await this._rpc.rpc.PresenceService.announce(peerState);
  }

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
          announce: async (peerState: PeerState) => await this._params.onAnnounce(peerState)
        }
      },
      port: context.createPort('rpc', { contentType: 'application/presence, messageType="dxos.rpc.Message"' }) // TODO(mykola): Different contentType?
    });
    await this._rpc.open();
    await this._sendAnnounce();
    this._sendInterval = setInterval(() => this._sendAnnounce(), this._params.resendAnnounce);
    this.opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    log('close', { err });
    await this._rpc?.close();
    this._sendInterval && clearInterval(this._sendInterval);
    this.closed.wake();
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
