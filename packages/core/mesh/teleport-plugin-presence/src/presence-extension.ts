//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event, Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { PeerState, PresenceService } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';
import { ComplexMap, ComplexSet } from '@dxos/util';

export type PresenceOptions = {
  connections?: PublicKey[];
  resendAnnounce?: number;
  offlineTimeout?: number;
};

/**
 * Sending presence pings between a set peers for a single teleport session.
 */
export class PresenceExtension implements TeleportExtension {
  public updatePeerStates = new Event<PeerState[]>();
  private readonly _receivedAnnounces = new ComplexMap<PublicKey, PeerState>(PublicKey.hash);
  private readonly _sentAnnounces = new ComplexSet<PublicKey>(PublicKey.hash); // TODO(mykola): Memory leak, never cleaned up?
  private _sendInterval?: NodeJS.Timeout;

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;
  private readonly _opened = new Trigger();

  private _options: PresenceOptions;

  constructor({ connections = [], resendAnnounce = 1000, offlineTimeout = 30_000 }: PresenceOptions = {}) {
    assert(offlineTimeout, 'offlineTimeout must be set');
    this._options = { connections, resendAnnounce, offlineTimeout };
  }

  setConnections(connections: PublicKey[]) {
    this._options.connections = connections;
  }

  sendAnnounces(peerStates: PeerState[]) {
    peerStates.forEach(async (peerState) => {
      assert(this._opened, 'Extension not opened');
      assert(this._rpc, 'RPC not initialized');
      if (this._sentAnnounces.has(peerState.peerId) || this._extensionContext?.remotePeerId === peerState.peerId) {
        return;
      }
      this._sentAnnounces.add(peerState.peerId);
      await this._rpc.rpc.PresenceService.announce(peerState);
    });
  }

  getPeerStates() {
    return [...this._receivedAnnounces.values()];
  }

  async onOpen(context: ExtensionContext): Promise<void> {
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
          announce: async (peerState: PeerState) => {
            const oldPeerState = this._receivedAnnounces.get(peerState.peerId);
            if (oldPeerState && oldPeerState.timestamp.getTime() > peerState.timestamp.getTime()) {
              return;
            }
            this._receivedAnnounces.set(peerState.peerId, peerState);
            this.updatePeerStates.emit([...this._receivedAnnounces.values()]);
          }
        }
      },
      port: context.createPort('rpc', { contentType: 'application/presence, messageType="dxos.rpc.Message"' }) // TODO(mykola): Different contentType?
    });
    await this._rpc.open();
    await this._sendAnnounce();
    this._sendInterval = setInterval(() => this._sendAnnounce(), this._options.resendAnnounce);
    this._opened.wake();
  }

  async onClose(err?: Error): Promise<void> {
    log('close', { err });
    await this._rpc?.close();
    this._sendInterval && clearInterval(this._sendInterval);
  }

  private async _sendAnnounce() {
    await this._rpc?.rpc.PresenceService.announce({
      peerId: this._extensionContext!.localPeerId,
      connections: this._options.connections,
      messageId: PublicKey.random(),
      timestamp: new Date()
    });
  }
}

type ServiceBundle = {
  PresenceService: PresenceService;
};
