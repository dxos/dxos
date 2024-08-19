//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type SwarmEvent, type SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';

export interface Message {
  author: PublicKey;
  recipient: PublicKey;
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

/**
 * Message routing interface.
 */
export interface SignalMethods {
  /**
   * Emits when other peers join or leave the swarm.
   */
  swarmEvent: Event<{ topic: PublicKey; swarmEvent: SwarmEvent }>;

  /**
   * Emits when a message is received.
   */
  onMessage: Event<Message>;

  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join: (params: { topic: PublicKey; peerId: PublicKey }) => Promise<void>;

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave: (params: { topic: PublicKey; peerId: PublicKey }) => Promise<void>;

  /**
   * Send message to peer.
   */
  sendMessage: (message: Message) => Promise<void>;

  /**
   * Start receiving messages from peer.
   */
  // TODO(burdon): Return unsubscribe function. Encapsulate callback/routing here.
  subscribeMessages: (peerId: PublicKey) => Promise<void>;

  /**
   * Stop receiving messages from peer.
   */
  unsubscribeMessages: (peerId: PublicKey) => Promise<void>;
}

/**
 * Signaling client.
 */
export interface SignalClientMethods extends SignalMethods {
  open(): Promise<this>;
  close(): Promise<this>;
  getStatus(): SignalStatus;
}
