//
// Copyright 2020 DXOS.org
//

import { type Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { type PeerInfo } from '@dxos/messaging';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join(ctx: Context, params: { topic: PublicKey; peer: PeerInfo }): Promise<void>;

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave(ctx: Context, params: { topic: PublicKey; peer: PeerInfo }): Promise<void>;
}
