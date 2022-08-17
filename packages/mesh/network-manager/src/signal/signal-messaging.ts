//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';
import { MakeOptional } from '@dxos/util';

import { Answer, NetworkMessage, Offer, Signal } from '../proto/gen/dxos/mesh/networkMessage';

export interface OfferMessage extends MakeOptional<NetworkMessage, 'messageId'> {
  author: PublicKey;
  recipient: PublicKey;
  data: { offer: Offer };
}

export interface SignalMessage extends MakeOptional<NetworkMessage, 'messageId'> {
  author: PublicKey;
  recipient: PublicKey;
  data: { signal: Signal };
}

/**
 * Signal peer messaging interface.
 */

export interface SignalMessaging {
  /**
   * Offer/answer RPC.
   */
  offer(msg: OfferMessage): Promise<Answer>;

  /**
   * Reliably send a signal to a peer.
   */
  signal(msg: SignalMessage): Promise<void>;
}
