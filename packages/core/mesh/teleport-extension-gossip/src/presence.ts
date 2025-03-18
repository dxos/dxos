//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type WithTypeUrl } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { ComplexMap } from '@dxos/util';

import { type Gossip } from './gossip';

export type PresenceParams = {
  /**
   * Interval between presence announces.
   */
  announceInterval: number;
  /**
   * Timeout after which a peer is considered offline.
   * Should be greater than announceInterval.
   */
  offlineTimeout: number;

  /**
   * Halo device key of the local peer.
   */
  deviceKey: PublicKey;

  gossip: Gossip;
};

const PRESENCE_CHANNEL_ID = 'dxos.mesh.presence.Presence';

/**
 * Presence manager.
 * Keeps track of all peers that are connected to the local peer.
 * Routes received presence announces to all connected peers.
 * Exposes API to get the list of peers that are online.
 */
export class Presence extends Resource {
  public readonly updated = new Event<void>();
  public readonly newPeer = new Event<PeerState>();

  private readonly _peerStates = new ComplexMap<PublicKey, GossipMessage>(PublicKey.hash);
  private readonly _peersByIdentityKey = new ComplexMap<PublicKey, GossipMessage[]>(PublicKey.hash);

  // remotePeerId -> PresenceExtension

  constructor(private readonly _params: PresenceParams) {
    super();
    invariant(
      this._params.announceInterval < this._params.offlineTimeout,
      'Announce interval should be less than offline timeout.',
    );

    this._params.gossip.listen(PRESENCE_CHANNEL_ID, (message) => {
      this._receiveAnnounces(message);
    });
  }

  protected override async _open(): Promise<void> {
    // Send announce to all connected peers.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        const peerState: WithTypeUrl<PeerState> = {
          '@type': 'dxos.mesh.presence.PeerState',
          deviceKey: this._params.deviceKey,
          connections: this._params.gossip.getConnections(),
        };
        this._params.gossip.postMessage(PRESENCE_CHANNEL_ID, peerState);
      },
      this._params.announceInterval,
    );

    // Emit updated event in case some peers went offline.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this.updated.emit();
      },
      this._params.offlineTimeout,
    );

    // Remove peer state when connection is closed.
    this._params.gossip.connectionClosed.on(this._ctx, (peerId) => {
      const peerState = this._peerStates.get(peerId);
      if (peerState != null) {
        this._peerStates.delete(peerId);
        this._removePeerFromIdentityKeyIndex(peerState);
        this.updated.emit();
      }
    });
  }

  protected override async _catch(err: Error): Promise<void> {
    log.catch(err);
  }

  getPeers(): PeerState[] {
    return Array.from(this._peerStates.values()).map((message) => message.payload);
  }

  getPeersByIdentityKey(key: PublicKey): PeerState[] {
    return (this._peersByIdentityKey.get(key) ?? []).filter(this._isOnline).map((m) => m.payload);
  }

  getPeersOnline(): PeerState[] {
    return Array.from(this._peerStates.values())
      .filter(this._isOnline)
      .map((message) => message.payload);
  }

  private _isOnline = (message: GossipMessage): boolean => {
    return message.timestamp.getTime() > Date.now() - this._params.offlineTimeout;
  };

  getLocalState(): PeerState {
    return {
      deviceKey: this._params.deviceKey,
      connections: this._params.gossip.getConnections(),
      peerId: this._params.gossip.deviceKey,
    };
  }

  private _receiveAnnounces(message: GossipMessage) {
    invariant(message.channelId === PRESENCE_CHANNEL_ID, `Invalid channel ID: ${message.channelId}`);
    const oldPeerState = this._peerStates.get(message.deviceKey);
    if (!oldPeerState || oldPeerState.timestamp.getTime() < message.timestamp.getTime()) {
      // Assign peer id to payload.
      (message.payload as PeerState).peerId = message.deviceKey;

      this._peerStates.set(message.deviceKey, message);
      this._updatePeerInIdentityKeyIndex(message);
      this.updated.emit();
    }
  }

  private _removePeerFromIdentityKeyIndex(peerState: GossipMessage) {
    const identityPeerList = this._peersByIdentityKey.get((peerState.payload as PeerState).deviceKey) ?? [];
    const peerIdIndex = identityPeerList.findIndex((identity) => identity.deviceKey?.equals(peerState.deviceKey));
    if (peerIdIndex >= 0) {
      identityPeerList.splice(peerIdIndex, 1);
    }
  }

  private _updatePeerInIdentityKeyIndex(newState: GossipMessage) {
    const identityKey = (newState.payload as PeerState).deviceKey;
    const identityKeyPeers = this._peersByIdentityKey.get(identityKey) ?? [];
    const existingIndex = identityKeyPeers.findIndex((p) => p.deviceKey && newState.deviceKey?.equals(p.deviceKey));
    if (existingIndex >= 0) {
      const oldState = identityKeyPeers.splice(existingIndex, 1, newState)[0];
      if (!this._isOnline(oldState)) {
        this.newPeer.emit(newState.payload);
      }
    } else {
      this._peersByIdentityKey.set(identityKey, identityKeyPeers);
      identityKeyPeers.push(newState);
      this.newPeer.emit(newState.payload);
    }
  }
}
