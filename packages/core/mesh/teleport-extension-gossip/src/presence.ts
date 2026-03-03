//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { anyPack, anyUnpack, create, encodePublicKey, timestampDate, toPublicKey } from '@dxos/protocols/buf';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';
import { type PeerState, PeerStateSchema } from '@dxos/protocols/buf/dxos/mesh/presence_pb';
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

type PeerEntry = {
  message: GossipMessage;
  state: PeerState;
};

/**
 * Presence manager.
 * Keeps track of all peers that are connected to the local peer.
 * Routes received presence announces to all connected peers.
 * Exposes API to get the list of peers that are online.
 */
export class Presence extends Resource {
  public readonly updated = new Event<void>();
  public readonly newPeer = new Event<PeerState>();

  private readonly _peerStates = new ComplexMap<PublicKey, PeerEntry>(PublicKey.hash);
  private readonly _peersByIdentityKey = new ComplexMap<PublicKey, PeerEntry[]>(PublicKey.hash);

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
    scheduleTaskInterval(
      this._ctx,
      async () => {
        const peerState = create(PeerStateSchema, {
          identityKey: encodePublicKey(this._params.identityKey),
          connections: this._params.gossip.getConnections().map((key) => encodePublicKey(key)),
        });
        this._params.gossip.postMessage(PRESENCE_CHANNEL_ID, anyPack(PeerStateSchema, peerState));
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
      const entry = this._peerStates.get(peerId);
      if (entry != null) {
        this._peerStates.delete(peerId);
        this._removePeerFromIdentityKeyIndex(entry);
        this.updated.emit();
      }
    });
  }

  protected override async _catch(err: Error): Promise<void> {
    log.catch(err);
  }

  getPeers(): PeerState[] {
    return Array.from(this._peerStates.values()).map((entry) => entry.state);
  }

  getPeersByIdentityKey(key: PublicKey | BufPublicKey | { data: Uint8Array }): PeerState[] {
    const keyToUse = key instanceof PublicKey ? key : PublicKey.from(key.data);
    return (this._peersByIdentityKey.get(keyToUse) ?? []).filter(this._isOnline).map((entry) => entry.state);
  }

  getPeersOnline(): PeerState[] {
    return Array.from(this._peerStates.values())
      .filter(this._isOnline)
      .map((entry) => entry.state);
  }

  private _isOnline = (entry: PeerEntry): boolean => {
    if (!entry.message.timestamp) {
      return false;
    }
    return timestampDate(entry.message.timestamp).getTime() > Date.now() - this._params.offlineTimeout;
  };

  getLocalState(): PeerState {
    return create(PeerStateSchema, {
      identityKey: encodePublicKey(this._params.identityKey),
      connections: this._params.gossip.getConnections().map((key) => encodePublicKey(key)),
      peerId: encodePublicKey(this._params.gossip.localPeerId),
    });
  }

  private _receiveAnnounces(message: GossipMessage): void {
    invariant(message.channelId === PRESENCE_CHANNEL_ID, `Invalid channel ID: ${message.channelId}`);
    const peerId = message.peerId ? toPublicKey(message.peerId) : undefined;
    if (!peerId) {
      return;
    }
    if (!message.payload) {
      return;
    }
    const state = anyUnpack(message.payload, PeerStateSchema);
    if (!state) {
      return;
    }
    // Embed peerId from the gossip envelope into the state (omitted when sent over the network).
    state.peerId = encodePublicKey(peerId);

    const existing = this._peerStates.get(peerId);
    const oldTime = existing?.message.timestamp ? timestampDate(existing.message.timestamp).getTime() : 0;
    const newTime = message.timestamp ? timestampDate(message.timestamp).getTime() : 0;
    if (!existing || oldTime < newTime) {
      const entry: PeerEntry = { message, state };
      this._peerStates.set(peerId, entry);
      this._updatePeerInIdentityKeyIndex(entry);
      this.updated.emit();
    }
  }

  private _removePeerFromIdentityKeyIndex(entry: PeerEntry): void {
    const identityKey = this._extractIdentityKey(entry.state);
    if (!identityKey) {
      return;
    }
    const identityPeerList = this._peersByIdentityKey.get(identityKey) ?? [];
    const statePeerId = entry.state.peerId ? toPublicKey(entry.state.peerId) : undefined;
    const peerIdIndex = identityPeerList.findIndex((e) => {
      const entryPeerId = e.state.peerId ? toPublicKey(e.state.peerId) : undefined;
      return statePeerId && entryPeerId && statePeerId.equals(entryPeerId);
    });
    if (peerIdIndex >= 0) {
      identityPeerList.splice(peerIdIndex, 1);
    }
  }

  private _updatePeerInIdentityKeyIndex(newEntry: PeerEntry): void {
    const identityKey = this._extractIdentityKey(newEntry.state);
    if (!identityKey) {
      return;
    }
    const identityKeyPeers = this._peersByIdentityKey.get(identityKey) ?? [];
    const newPeerId = newEntry.state.peerId ? toPublicKey(newEntry.state.peerId) : undefined;
    const existingIndex = identityKeyPeers.findIndex((e) => {
      const entryPeerId = e.state.peerId ? toPublicKey(e.state.peerId) : undefined;
      return newPeerId && entryPeerId && newPeerId.equals(entryPeerId);
    });
    if (existingIndex >= 0) {
      const oldEntry = identityKeyPeers.splice(existingIndex, 1, newEntry)[0];
      if (!this._isOnline(oldEntry)) {
        this.newPeer.emit(newEntry.state);
      }
    } else {
      this._peersByIdentityKey.set(identityKey, identityKeyPeers);
      identityKeyPeers.push(newEntry);
      this.newPeer.emit(newEntry.state);
    }
  }

  private _extractIdentityKey(state: PeerState): PublicKey | undefined {
    if (!state.identityKey) {
      return undefined;
    }
    return toPublicKey(state.identityKey);
  }
}
