import { PublicKey } from '@dxos/protocols';
import { Answer, NetworkMessage, Offer, Signal } from '../proto/gen/dxos/mesh/networkMessage';


export interface OfferMessage extends NetworkMessage {
  data: { offer: Offer };
}

export interface SignalMessage extends NetworkMessage {
  data: { signal: Signal };
}

/**
 * Signal peer messaging interface.
 */

export interface OfferMessage {
  /**
   * Offer/answer RPC.
   */
  offer(author: PublicKey, recipient: PublicKey, msg: OfferMessage): Promise<Answer>;

  /**
   * Reliably send a signal to a peer.
   */
  signal(author: PublicKey, recipient: PublicKey, msg: SignalMessage): Promise<void>;
}
