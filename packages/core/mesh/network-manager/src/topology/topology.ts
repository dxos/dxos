//
// Copyright 2020 DXOS.org
//

export interface SwarmController {
  /**
   * Get current state.
   */
  getState(): SwarmState;

  /**
   * Initiate a connection.
   */
  connect(peer: string): void;

  /**
   * Disconnect from a peer.
   */
  disconnect(peer: string): void;
}

export interface SwarmState {
  /**
   * This node's peer Id.
   */
  ownPeerId: string;

  /**
   * Peers with established connections.
   */
  connected: string[];

  /**
   * Candidates for connection. Does not intersect with a set of already connected peers.
   */
  candidates: string[];

  /**
   * All peers in the swarm, including candidates, connected peers and those we have connection timeout with.
   */
  allPeers: string[];
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
  onOffer(peer: string): Promise<boolean>;

  /**
   * Called when swarm is destroyed or topology is changed.
   * Any error thrown here will be a critical error for the swarm.
   */
  destroy(): Promise<void>;
}
