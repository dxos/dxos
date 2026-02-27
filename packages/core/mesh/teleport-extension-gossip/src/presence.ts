//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type WithTypeUrl } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';
import { type PeerState } from '@dxos/protocols/buf/dxos/mesh/presence_pb';
import { type GossipMessage } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';
import { ComplexMap } from '@dxos/util';

import { type Gossip } from './gossip';

export type PresenceProps = {
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
   * Identity key of the local peer.
   */
  identityKey: PublicKey; // TODO(mykola): Remove once IdentityKey can be obtained from DeviceKey.

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

  constructor(private readonly _params: PresenceProps) {
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
        // Proto codec handles @dxos/keys PublicKey at runtime; cast at boundary.
        const peerState = {
          '@type': 'dxos.mesh.presence.PeerState',
          identityKey: this._params.identityKey,
          connections: this._params.gossip.getConnections(),
        } as any as WithTypeUrl<PeerState>;
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
    // Proto codec returns proto-typed payloads at runtime; cast at boundary.
    return Array.from(this._peerStates.values()).map((message) => message.payload) as any;
  }

  getPeersByIdentityKey(key: PublicKey | BufPublicKey | { data: Uint8Array }): PeerState[] {
    const keyToUse = key instanceof PublicKey ? key : PublicKey.from(key.data);
    return (this._peersByIdentityKey.get(keyToUse) ?? []).filter(this._isOnline).map((m) => m.payload) as any;
  }

  getPeersOnline(): PeerState[] {
    return Array.from(this._peerStates.values())
      .filter(this._isOnline)
      .map((message) => message.payload) as any;
  }

  private _isOnline = (message: GossipMessage): boolean => {
    // Proto codec returns Date at runtime for Timestamp fields; cast at boundary.
    return (message.timestamp as any).getTime() > Date.now() - this._params.offlineTimeout;
  };

  getLocalState(): PeerState {
    return {
      identityKey: this._params.identityKey,
      connections: this._params.gossip.getConnections(),
      peerId: this._params.gossip.localPeerId,
    } as any;
  }

  private _receiveAnnounces(message: GossipMessage): void {
    invariant(message.channelId === PRESENCE_CHANNEL_ID, `Invalid channel ID: ${message.channelId}`);
    // Proto codec returns @dxos/keys PublicKey at runtime; cast at boundary.
    const oldPeerState = this._peerStates.get(message.peerId as any);
    if (!oldPeerState || (oldPeerState.timestamp as any).getTime() < (message.timestamp as any).getTime()) {
      (message.payload as any).peerId = message.peerId;
      this._peerStates.set(message.peerId as any, message);
      this._updatePeerInIdentityKeyIndex(message);
      this.updated.emit();
    }
  }

  private _removePeerFromIdentityKeyIndex(peerState: GossipMessage): void {
    const identityPeerList = this._peersByIdentityKey.get((peerState.payload as any).identityKey) ?? [];
    const peerIdIndex = identityPeerList.findIndex((id) => (id.peerId as any)?.equals(peerState.peerId));
    if (peerIdIndex >= 0) {
      identityPeerList.splice(peerIdIndex, 1);
    }
  }

  private _updatePeerInIdentityKeyIndex(newState: GossipMessage): void {
    const identityKey = (newState.payload as any).identityKey;
    const identityKeyPeers = this._peersByIdentityKey.get(identityKey) ?? [];
    const existingIndex = identityKeyPeers.findIndex((p) => p.peerId && (newState.peerId as any)?.equals(p.peerId));
    if (existingIndex >= 0) {
      const oldState = identityKeyPeers.splice(existingIndex, 1, newState)[0];
      if (!this._isOnline(oldState)) {
        this.newPeer.emit(newState.payload as any);
      }
    } else {
      this._peersByIdentityKey.set(identityKey, identityKeyPeers);
      identityKeyPeers.push(newState);
      this.newPeer.emit(newState.payload as any);
    }
  }
}
