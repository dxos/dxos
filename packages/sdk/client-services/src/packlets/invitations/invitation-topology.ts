//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SwarmController, Topology } from '@dxos/network-manager';
import { InvitationOptions } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ComplexMap } from '@dxos/util';

/**
 * How many times to dial one peer before giving up on it. A connection can die after the transport
 * comes up but before the invitation flow completes, and a single attempt then strands both sides:
 * guests never initiate, so nothing redials.
 */
const MAX_CONNECTION_ATTEMPTS = 3;

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
   * Dial count per peer we tried to establish a connection with, capped by
   * {@link MAX_CONNECTION_ATTEMPTS}. In invitation flow peers are assigned random ids when they
   * join the swarm, so a peer that reloads an invitation is retried under its new id; a peer that
   * leaves the swarm is dropped from the map, which also resets its budget.
   */
  private _attempts = new ComplexMap<PublicKey, number>(PublicKey.hash);

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
      // record the attempt here as well in case another host initiated a connection with us; a
      // connected peer must not burn its retry budget, so this floors at one rather than counting up
      connected.forEach((peerId) => this._attempts.set(peerId, Math.max(this._attempts.get(peerId) ?? 0, 1)));
      return;
    }

    // cleanup — drop peers that have left the swarm, so a peer that rejoins starts fresh
    const retained = new ComplexMap<PublicKey, number>(PublicKey.hash);
    for (const peerId of allPeers) {
      const attempts = this._attempts.get(peerId);
      if (attempts !== undefined) {
        retained.set(peerId, attempts);
      }
    }
    this._attempts = retained;

    const nextPeer = candidates.find((peerId) => (this._attempts.get(peerId) ?? 0) < MAX_CONNECTION_ATTEMPTS);
    if (nextPeer != null) {
      const attempt = (this._attempts.get(nextPeer) ?? 0) + 1;
      log('invitation connect', { ownPeerId, remotePeerId: nextPeer, attempt });
      this._controller.connect(nextPeer);
      this._attempts.set(nextPeer, attempt);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    return (this._attempts.get(peer) ?? 0) < MAX_CONNECTION_ATTEMPTS;
  }

  async destroy(): Promise<void> {
    this._attempts.clear();
  }

  toString(): string {
    return `InvitationTopology(${this._role === InvitationOptions.Role.GUEST ? 'guest' : 'host'})`;
  }
}
