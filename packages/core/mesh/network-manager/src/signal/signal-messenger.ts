//
// Copyright 2022 DXOS.org
//

import { type PeerInfo } from '@dxos/messaging';
import { type Answer, type Offer, type Signal, type SignalBatch } from '@dxos/protocols/proto/dxos/mesh/swarm';

export interface OfferMessage {
  author: PeerInfo;
  recipient: PeerInfo;
  swarmKey: string;
  sessionId: string;
  data: { offer: Offer };
}

export interface SignalMessage {
  author: PeerInfo;
  recipient: PeerInfo;
  swarmKey: string;
  sessionId: string;
  data: { signal?: Signal; signalBatch?: SignalBatch };
}

/**
 * Signal peer messaging interface.
 */
export interface SignalMessenger {
  /**
   * Offer/answer RPC.
   */
  offer(msg: OfferMessage): Promise<Answer>;

  /**
   * Reliably send a signal to a peer.
   */
  signal(msg: SignalMessage): Promise<void>;
}
