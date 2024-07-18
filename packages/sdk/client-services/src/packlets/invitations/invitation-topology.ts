//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SwarmController, Topology } from '@dxos/network-manager';
import { InvitationOptions } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ComplexSet } from '@dxos/util';

/**
 * Hosts are listening on an invitation topic.
 * They initiate a connection with any new peer if they are not currently in the invitation flow
 * with another peer (connected.length > 0).
 * When the invitation flow ends guest leaves the swarm and topology is updated once again,
 * so we can connect to the next peer we haven't tried yet.
 * If the peer turns out to be a host or a malicious guest their ID is remembered so that we don't try
 * to establish a connection with them again.
 *
 * Guests don't initiate connections. They accept all connections because if we reject,
 * the host won't retry their offer.
 * Even if we started an invitation flow with one host we might want to try other hosts in case
 * the first one failed due to a network error, so multiple connections are accepted.
 */
export class InvitationTopology implements Topology {
  private _controller?: SwarmController;

  /**
   * Peers we tried to establish a connection with.
   * In invitation flow peers are assigned random ids when they join the swarm, so we'll retry
   * a peer if they reload an invitation.
   *
   * Consider keeping a separate set for peers we know are hosts and have some retry timeout
   * for guests we failed an invitation flow with (potentially due to a network error).
   */
  private _seenPeers = new ComplexSet<PublicKey>(PublicKey.hash);

  constructor(private readonly _role: InvitationOptions.Role) {}

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized.');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized.');
    const { ownPeerId, candidates, connected, allPeers } = this._controller.getState();

    // guests don't initiate connections
    if (this._role === InvitationOptions.Role.GUEST) {
      return;
    }

    // don't start a connection while we have an active invitation flow
    if (connected.length > 0) {
      // update seenPeers here as well in case another host initiated a connection with us
      connected.forEach((c) => this._seenPeers.add(c));
      return;
    }

    const firstUnknownPeer = candidates.find((peerId) => !this._seenPeers.has(peerId));
    // cleanup
    this._seenPeers = new ComplexSet<PublicKey>(
      PublicKey.hash,
      allPeers.filter((peerId) => this._seenPeers.has(peerId)),
    );
    if (firstUnknownPeer != null) {
      log('invitation connect', { ownPeerId, remotePeerId: firstUnknownPeer });
      this._controller.connect(firstUnknownPeer);
      this._seenPeers.add(firstUnknownPeer);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    return !this._seenPeers.has(peer);
  }

  async destroy(): Promise<void> {
    this._seenPeers.clear();
  }

  toString() {
    return `InvitationTopology(${this._role === InvitationOptions.Role.GUEST ? 'guest' : 'host'})`;
  }
}
