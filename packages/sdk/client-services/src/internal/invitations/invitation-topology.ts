//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SwarmController, Topology } from '@dxos/network-manager';
import { InvitationOptions_Role } from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { ComplexMap, ComplexSet } from '@dxos/util';

/** Connections a host starts to one peer before it stops retrying that peer. */
const MAX_DIALS_PER_PEER = 3;

/**
 * Hosts are listening on an invitation topic.
 * They dial one peer at a time, and only while they have no connection (no invitation flow in progress)
 * and no dial still waiting for the swarm to create its connection.
 * A peer whose connection closed is dialed again once the swarm offers it as a candidate after its backoff,
 * up to {@link MAX_DIALS_PER_PEER} times, so a session that fails before the invitation opens does not strand it.
 * A retired peer, an admitted guest or another host, is not dialed and its offers are refused.
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
   * Dials per peer, keyed by the client's stable network peer key; an inbound session counts once,
   * and a count is pruned once its peer leaves the swarm, so a guest that rejoins is dialed afresh.
   */
  private _dials = new ComplexMap<PublicKey, number>(PublicKey.hash);

  /** Dialed peers without a connection yet; a dial stays pending only while its peer is a candidate. */
  private _pending = new ComplexSet<PublicKey>(PublicKey.hash);

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

    // A candidate has no connection and is still in the swarm, so a peer that stopped being one ends its pending dial.
    this._pending = new ComplexSet<PublicKey>(
      PublicKey.hash,
      candidates.filter((peerId) => this._pending.has(peerId)),
    );

    // don't start a connection while we have an active invitation flow
    if (connected.length > 0) {
      // Record a connection another host initiated with us, without counting one we already dialed again.
      connected.forEach((peerId) => {
        if (!this._dials.has(peerId)) {
          this._dials.set(peerId, 1);
        }
      });
      return;
    }

    // Cleanup.
    this._dials = new ComplexMap<PublicKey, number>(
      PublicKey.hash,
      allPeers.flatMap((peerId): [PublicKey, number][] => {
        const count = this._dials.get(peerId);
        return count === undefined ? [] : [[peerId, count]];
      }),
    );

    // A pending dial already holds the one invitation flow.
    if (this._pending.size > 0) {
      return;
    }

    const nextPeer = candidates.find((peerId) => (this._dials.get(peerId) ?? 0) < MAX_DIALS_PER_PEER);
    if (nextPeer != null) {
      const dials = (this._dials.get(nextPeer) ?? 0) + 1;
      log('invitation connect', { ownPeerId, remotePeerId: nextPeer, dials });
      this._dials.set(nextPeer, dials);
      this._pending.add(nextPeer);
      this._controller.connect(nextPeer);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    const accept = (this._dials.get(peer) ?? 0) < MAX_DIALS_PER_PEER;
    if (!accept) {
      // the peer's offer displaced any dial of ours to it, which now never opens
      this._pending.delete(peer);
    }
    return accept;
  }

  /** Stops dialing a peer and refuses its offers while it stays in the swarm. */
  retire(peer: PublicKey): void {
    this._dials.set(peer, MAX_DIALS_PER_PEER);
  }

  async destroy(): Promise<void> {
    this._dials.clear();
    this._pending.clear();
  }

  toString(): string {
    return `InvitationTopology(${this._role === InvitationOptions_Role.GUEST ? 'guest' : 'host'})`;
  }
}
