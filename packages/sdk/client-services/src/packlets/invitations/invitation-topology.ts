//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SwarmController, Topology } from '@dxos/network-manager';
import { Options } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ComplexSet } from '@dxos/util';

/**
 * Hosts are listening on an invitation topic.
 * They initiate a connection with any new peer if they are not currently in the invitation flow
 * with another peer.
 * When the invitation flow ends guest leaves the swarm and topology is updated once again,
 * so we can connect to the next peer we haven't tried before yet.
 * If the peer turns out to be a host their ID is remembered so that we don't try to establish
 * a connection with them again.
 *
 * Guests don't initiate connections. They accept all connections because if we reject,
 * the host won't retry their offer.
 * Even if we started an invitation flow with one host we might want to try other hosts in case
 * the first one failed due to a network error, so multiple connections are accepted.
 */
export class InvitationTopology implements Topology {
  private _controller?: SwarmController;
  private _wrongRolePeers = new ComplexSet<PublicKey>(PublicKey.hash);

  constructor(private readonly _role: Options.Role) {}

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized.');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized.');
    if (this._role === Options.Role.GUEST) {
      return;
    }
    const { candidates, connected } = this._controller.getState();
    // don't start a connection while we have an active invitation flow
    if (connected.length > 0) {
      return;
    }

    const cleanedUpWrongRolePeerSet = new ComplexSet<PublicKey>(PublicKey.hash);
    let firstUnknownPeer: PublicKey | null = null;
    for (const candidate of candidates) {
      if (this._wrongRolePeers.has(candidate)) {
        cleanedUpWrongRolePeerSet.add(candidate);
      } else if (firstUnknownPeer == null) {
        firstUnknownPeer = candidate;
      }
    }

    this._wrongRolePeers = cleanedUpWrongRolePeerSet;
    if (firstUnknownPeer != null) {
      this._controller.connect(firstUnknownPeer);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    return !this._wrongRolePeers.has(peer);
  }

  public addWrongRolePeer(peerId: PublicKey) {
    if (this._wrongRolePeers.size > 500) {
      log.warn('wrongRolePeerKeys set is too big, likely a cleanup bug');
      this._wrongRolePeers.clear();
    }
    this._wrongRolePeers.add(peerId);
  }

  async destroy(): Promise<void> {
    this._wrongRolePeers.clear();
  }

  toString() {
    return `InvitationTopology(${this._role === Options.Role.GUEST ? 'guest' : 'host'})`;
  }
}
