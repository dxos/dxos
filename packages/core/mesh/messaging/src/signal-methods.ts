//
// Copyright 2022 DXOS.org
//

import { type Any } from '@dxos/codec-protobuf';
import { type PublicKey } from '@dxos/keys';

export interface Message {
  author: PublicKey;
  recipient: PublicKey;
  payload: Any;
}

export interface SignalMethods {
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
  subscribeMessages: (peerId: PublicKey) => Promise<void>;

  /**
   * Stop receiving messages from peer.
   */
  unsubscribeMessages: (peerId: PublicKey) => Promise<void>;
}
