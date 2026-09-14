//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SwarmController, Topology } from '@dxos/network-manager';
import { InvitationOptions_Role } from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { ComplexMap } from '@dxos/util';

/** Connections a host starts to one peer before it stops retrying that peer. */
const MAX_DIALS_PER_PEER = 3;

/**
 * Hosts are listening on an invitation topic.
 * They initiate a connection with a peer if they are not currently in the invitation flow
 * with another peer (connected.length > 0).
 * A peer whose connection closed is dialed again once the swarm offers it as a candidate after its backoff,
 * up to {@link MAX_DIALS_PER_PEER} times, so a session that fails before the invitation opens does not strand it.
 * When the invitation flow ends guest leaves the swarm and topology is updated once again,
 * so we can connect to the next peer.
 *
 * Guests don't initiate connections. They accept all connections because if we reject,
 * the host won't retry their offer.
 * Even if we started an invitation flow with one host we might want to try other hosts in case
 * the first one failed due to a network error, so multiple connections are accepted.
 */
export class InvitationTopology implements Topology {
  private _controller?: SwarmController;

  /**
   * Connections started with each peer, counted when this host dials or when another host's connection is first seen.
   * In invitation flow peers are assigned random ids when they join the swarm, so we'll retry
   * a peer if they reload an invitation.
   */
  private _dials = new ComplexMap<PublicKey, number>(PublicKey.hash);

  constructor(private readonly _role: InvitationOptions_Role) {}

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized.');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized.');
    const { ownPeerId, candidates, connected, allPeers } = this._controller.getState();

    // guests don't initiate connections
    if (this._role === InvitationOptions_Role.GUEST) {
      return;
    }

    // don't start a connection while we have an active invitation flow
    if (connected.length > 0) {
      // record a connection another host initiated with us, without counting one we already dialed again
      connected.forEach((peerId) => {
        if (!this._dials.has(peerId)) {
          this._dials.set(peerId, 1);
        }
      });
      return;
    }

    const nextPeer = candidates.find((peerId) => (this._dials.get(peerId) ?? 0) < MAX_DIALS_PER_PEER);
    // cleanup
    this._dials = new ComplexMap<PublicKey, number>(
      PublicKey.hash,
      allPeers.flatMap((peerId): [PublicKey, number][] => {
        const count = this._dials.get(peerId);
        return count === undefined ? [] : [[peerId, count]];
      }),
    );
    if (nextPeer != null) {
      const dials = (this._dials.get(nextPeer) ?? 0) + 1;
      log('invitation connect', { ownPeerId, remotePeerId: nextPeer, dials });
      this._controller.connect(nextPeer);
      this._dials.set(nextPeer, dials);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    return (this._dials.get(peer) ?? 0) < MAX_DIALS_PER_PEER;
  }

  async destroy(): Promise<void> {
    this._dials.clear();
  }

  toString(): string {
    return `InvitationTopology(${this._role === InvitationOptions_Role.GUEST ? 'guest' : 'host'})`;
  }
}
