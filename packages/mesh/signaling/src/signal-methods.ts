//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Any } from './proto/gen/google/protobuf';

export interface SignalMethods {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join: ({
    topic,
    peerId
  }: {
    topic: PublicKey
    peerId: PublicKey
  }) => Promise<void>

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave: ({
    topic,
    peerId
  }: {
    topic: PublicKey
    peerId: PublicKey
  }) => Promise<void>

  /**
   * Send message to peer.
   */
  message: (
    author: PublicKey,
    recipient: PublicKey,
    payload: Any
  ) => Promise<void>

  /**
   * Start receiving messages from
   */
  subscribeMessages: (peerId: PublicKey) => Promise<void>
}
