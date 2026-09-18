//
// Copyright 2022 DXOS.org
//

import { Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { type PeerInfo } from '@dxos/messaging';
import {
  type Answer,
  type Close,
  type Offer,
  type Signal,
  type SignalBatch,
} from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

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
  data: { signal: Signal; signalBatch?: never } | { signal?: never; signalBatch: SignalBatch };
}

export interface CloseMessage {
  author: PeerInfo;
  recipient: PeerInfo;
  topic: PublicKey;
  sessionId: PublicKey;
  data: { close: Close };
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

  /**
   * Tell a peer that a session ended before its transport connected.
   */
  close(ctx: Context, msg: CloseMessage): Promise<void>;
}
