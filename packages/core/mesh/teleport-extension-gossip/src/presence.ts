//
// Copyright 2022 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { Event, scheduleTaskInterval } from '@dxos/async';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { type PeerState, PeerStateSchema } from '@dxos/protocols/buf/dxos/mesh/presence_pb';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
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

const PEER_STATE_TYPE_URL = 'dxos.mesh.presence.PeerState';

/** A received announce, decoded once on arrival rather than on every read. */
type PresenceRecord = {
  peerId: PublicKey;
  timestamp: Date;
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

  private readonly _peerStates = new ComplexMap<PublicKey, PresenceRecord>(PublicKey.hash);
  private readonly _peersByIdentityKey = new ComplexMap<PublicKey, PresenceRecord[]>(PublicKey.hash);

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
        this._params.gossip.postMessage(PRESENCE_CHANNEL_ID, this._toAnnounce(this.getLocalState()));
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
      const record = this._peerStates.get(peerId);
      if (record != null) {
        this._peerStates.delete(peerId);
        this._removePeerFromIdentityKeyIndex(record);
        this.updated.emit();
      }
    });
  }

  protected override async _catch(err: Error): Promise<void> {
    log.catch(err);
  }

  /** The local identity, as the domain key type callers compare against. */
  get localIdentityKey(): PublicKey {
    return this._params.identityKey;
  }

  getPeers(): PeerState[] {
    return Array.from(this._peerStates.values()).map((record) => record.state);
  }

  getPeersByIdentityKey(key: PublicKey): PeerState[] {
    return (this._peersByIdentityKey.get(key) ?? []).filter(this._isOnline).map((record) => record.state);
  }

  getPeersOnline(): PeerState[] {
    return Array.from(this._peerStates.values())
      .filter(this._isOnline)
      .map((record) => record.state);
  }

  private _isOnline = (record: PresenceRecord): boolean => {
    return record.timestamp.getTime() > Date.now() - this._params.offlineTimeout;
  };

  getLocalState(): PeerState {
    return create(PeerStateSchema, {
      identityKey: fromPublicKey(this._params.identityKey),
      connections: this._params.gossip.getConnections().map(fromPublicKey),
      peerId: fromPublicKey(this._params.gossip.localPeerId),
    });
  }

  /**
   * Gossip resolves `Any` payloads generically for every channel, so presence converts at its own
   * channel edge. Routed through the codec rather than a field map so the substitution table stays
   * the single definition of the two shapes.
   */
  private _toAnnounce(state: PeerState): unknown {
    return {
      ...decodeCompat<object>(PeerStateSchema, toBinary(PeerStateSchema, state)),
      '@type': PEER_STATE_TYPE_URL,
    };
  }

  private _receiveAnnounces(message: GossipMessage): void {
    invariant(message.channelId === PRESENCE_CHANNEL_ID, `Invalid channel ID: ${message.channelId}`);
    const previous = this._peerStates.get(message.peerId);
    if (previous && previous.timestamp.getTime() >= message.timestamp.getTime()) {
      return;
    }

    const record: PresenceRecord = {
      peerId: message.peerId,
      timestamp: message.timestamp,
      state: {
        ...fromBinary(PeerStateSchema, encodeCompat(PeerStateSchema, message.payload)),
        // The announcing peer omits its own peer id, so it is taken from the envelope.
        peerId: fromPublicKey(message.peerId),
      },
    };

    this._peerStates.set(message.peerId, record);
    this._updatePeerInIdentityKeyIndex(record);
    this.updated.emit();
  }

  private _removePeerFromIdentityKeyIndex(record: PresenceRecord): void {
    const identityKey = toPublicKey(record.state.identityKey);
    if (!identityKey) {
      return;
    }
    const identityPeerList = this._peersByIdentityKey.get(identityKey) ?? [];
    const peerIdIndex = identityPeerList.findIndex((peer) => peer.peerId.equals(record.peerId));
    if (peerIdIndex >= 0) {
      identityPeerList.splice(peerIdIndex, 1);
    }
  }

  private _updatePeerInIdentityKeyIndex(newRecord: PresenceRecord): void {
    const identityKey = toPublicKey(newRecord.state.identityKey);
    if (!identityKey) {
      return;
    }
    const identityKeyPeers = this._peersByIdentityKey.get(identityKey) ?? [];
    const existingIndex = identityKeyPeers.findIndex((peer) => peer.peerId.equals(newRecord.peerId));
    if (existingIndex >= 0) {
      const oldRecord = identityKeyPeers.splice(existingIndex, 1, newRecord)[0];
      if (!this._isOnline(oldRecord)) {
        this.newPeer.emit(newRecord.state);
      }
    } else {
      this._peersByIdentityKey.set(identityKey, identityKeyPeers);
      identityKeyPeers.push(newRecord);
      this.newPeer.emit(newRecord.state);
    }
  }
}
