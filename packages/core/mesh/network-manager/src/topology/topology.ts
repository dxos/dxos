//
// Copyright 2020 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

export interface SwarmController {
  /**
   * Get current state.
   */
  getState(): SwarmState;

  /**
   * Initiate a connection.
   */
  connect(peer: PublicKey): void;

  /**
   * Disconnect from a peer.
   */
  disconnect(peer: PublicKey): void;
}

export interface SwarmState {
  /**
   * This node's peer Id.
   */
  ownPeerId: PublicKey;

  /**
   * Peers with established connections.
   */
  connected: PublicKey[];

  /**
   * Candidates for connection. Does not intersect with a set of already connected peers.
   */
  candidates: PublicKey[];

  /**
   * Candidates for connection. Does not intersect with a set of already connected peers.
   */
  allPeers: PublicKey[];
}

export interface Topology {
  /**
   * Called when swarm is created.
   * May be used to bind the swarm controller and initialize any asynchronous actions.
   */
  init(controller: SwarmController): void;

  /**
   * Called when swarm state is updated.
   */
  update(): void;

  /**
   * Called when remote peer offers a connection.
   * @returns true - to accept the connection, false - to reject.
   */
  onOffer(peer: PublicKey): Promise<boolean>;

  /**
   * Called when swarm is destroyed or topology is changed.
   * Any error thrown here will be a critical error for the swarm.
   */
  destroy(): Promise<void>;
}
