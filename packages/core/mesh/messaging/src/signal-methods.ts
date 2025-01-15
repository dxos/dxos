//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Lifecycle } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { type Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type Message, type SwarmEvent } from '@dxos/protocols/proto/dxos/edge/signal';
import { type SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';

export type { Message, SwarmEvent };
export type PeerInfo = Peer;
export const PeerInfoHash = ({ peerKey }: PeerInfo) => peerKey;

export type SignalStatus = {
  host: string;
  state: SignalState;
  error?: string;
  reconnectIn: number;
  connectionStarted: Date;
  lastStateChange: Date;
};

/**
 * Message routing interface.
 */
export interface SignalMethods {
  /**
   * Emits when other peers join or leave the swarm.
   */
  swarmEvent: Event<SwarmEvent>;

  /**
   * Emits when a message is received.
   */
  onMessage: Event<Message>;

  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join: (params: { topic: PublicKey; peer: PeerInfo }) => Promise<void>;

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave: (params: { topic: PublicKey; peer: PeerInfo }) => Promise<void>;

  /**
   * Send message to peer.
   */
  sendMessage: (message: Message) => Promise<void>;

  /**
   * Start receiving messages from peer.
   * @deprecated
   */
  // TODO(burdon): Return unsubscribe function. Encapsulate callback/routing here.
  subscribeMessages: (peer: PeerInfo) => Promise<void>;

  /**
   * Stop receiving messages from peer.
   * @deprecated
   */
  unsubscribeMessages: (peer: PeerInfo) => Promise<void>;
}

/**
 * Signaling client.
 * TODO(mykola): Delete.
 * @deprecated
 */
export interface SignalClientMethods extends SignalMethods, Required<Lifecycle> {
  getStatus(): SignalStatus;
}
