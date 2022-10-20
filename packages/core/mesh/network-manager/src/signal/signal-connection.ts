//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join(params: { topic: PublicKey, peerId: PublicKey }): Promise<void>

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave(params: { topic: PublicKey, peerId: PublicKey }): Promise<void>
}
