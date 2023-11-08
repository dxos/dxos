//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type WithTypeUrl } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
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
export class Presence {
  public readonly updated = new Event<void>();
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private readonly _peerStates = new ComplexMap<PublicKey, GossipMessage>(PublicKey.hash);

  // remotePeerId -> PresenceExtension

  constructor(private readonly _params: PresenceParams) {
    invariant(
      this._params.announceInterval < this._params.offlineTimeout,
      'Announce interval should be less than offline timeout.',
    );

    this._params.gossip.listen(PRESENCE_CHANNEL_ID, (message) => {
      this._receiveAnnounces(message);
    });

    // Send announce to all connected peers.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        const peerState: WithTypeUrl<PeerState> = {
          '@type': 'dxos.mesh.presence.PeerState',
          identityKey: this._params.identityKey,
          connections: this._params.gossip.getConnections(),
        };
        await this._params.gossip.postMessage(PRESENCE_CHANNEL_ID, peerState);
      },
      _params.announceInterval,
    );

    // Emit updated event in case some peers went offline.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this.updated.emit();
      },
      _params.offlineTimeout,
    );

    // Remove peer state when connection is closed.
    this._params.gossip.connectionClosed.on((peerId) => {
      this._peerStates.delete(peerId);
      this.updated.emit();
    });
  }

  getPeers(): PeerState[] {
    return Array.from(this._peerStates.values()).map((message) => message.payload);
  }

  getPeersOnline(): PeerState[] {
    return Array.from(this._peerStates.values())
      .filter((message) => message.timestamp.getTime() > Date.now() - this._params.offlineTimeout)
      .map((message) => message.payload);
  }

  getLocalState(): PeerState {
    return {
      identityKey: this._params.identityKey,
      connections: this._params.gossip.getConnections(),
      peerId: this._params.gossip.localPeerId,
    };
  }

  async destroy() {
    await this._ctx.dispose();
  }

  private _receiveAnnounces(message: GossipMessage) {
    invariant(message.channelId === PRESENCE_CHANNEL_ID, `Invalid channel ID: ${message.channelId}`);
    const oldPeerState = this._peerStates.get(message.peerId);
    if (!oldPeerState || oldPeerState.timestamp.getTime() < message.timestamp.getTime()) {
      // Assign peer id to payload.
      (message.payload as PeerState).peerId = message.peerId;

      this._peerStates.set(message.peerId, message);
      this.updated.emit();
    }
  }
}
