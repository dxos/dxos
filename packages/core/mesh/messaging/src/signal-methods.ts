//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type Peer } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';

export type PeerInfo = Partial<Peer> & Required<Pick<Peer, 'peerKey'>>;
export const PeerInfoHash = ({ peerKey }: PeerInfo) => peerKey;

export interface Message {
  author: PeerInfo;
  recipient: PeerInfo;
  payload: {
    type_url: string;
    value: Uint8Array;
  };
}

export type SignalStatus = {
  host: string;
  state: SignalState;
  error?: string;
  reconnectIn: number;
  connectionStarted: Date;
  lastStateChange: Date;
};

export type SwarmEvent = {
  topic: PublicKey;

  /**
   * The peer was announced as available on the swarm.
   */
  peerAvailable?: {
    peer: PeerInfo;
    since: Date;
  };

  /**
   * The peer left, or their announcement timed out.
   */
  peerLeft?: {
    peer: PeerInfo;
  };
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
   */
  // TODO(burdon): Return unsubscribe function. Encapsulate callback/routing here.
  subscribeMessages: (peer: PeerInfo) => Promise<void>;

  /**
   * Stop receiving messages from peer.
   */
  unsubscribeMessages: (peer: PeerInfo) => Promise<void>;
}

/**
 * Signaling client.
 */
export interface SignalClientMethods extends SignalMethods {
  open(): Promise<this>;
  close(): Promise<this>;
  getStatus(): SignalStatus;
}
