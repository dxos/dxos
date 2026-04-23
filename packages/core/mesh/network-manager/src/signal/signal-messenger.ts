//
// Copyright 2022 DXOS.org
//

import { Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { type PeerInfo } from '@dxos/messaging';
import { type Answer, type Offer, type Signal, type SignalBatch } from '@dxos/protocols/proto/dxos/mesh/swarm';

export interface OfferMessage {
  author: PeerInfo;
  recipient: PeerInfo;
  topic: PublicKey;
  sessionId: PublicKey;
  data: { offer: Offer };
}

export interface SignalMessage {
  author: PeerInfo;
  recipient: PeerInfo;
  topic: PublicKey;
  sessionId: PublicKey;
  data: { signal?: Signal; signalBatch?: SignalBatch };
}

/**
 * Signal peer messaging interface.
 */
export interface SignalMessenger {
  /**
   * Offer/answer RPC.
   */
  offer(ctx: Context, msg: OfferMessage): Promise<Answer>;

  /**
   * Reliably send a signal to a peer.
   */
  signal(ctx: Context, msg: SignalMessage): Promise<void>;
}
