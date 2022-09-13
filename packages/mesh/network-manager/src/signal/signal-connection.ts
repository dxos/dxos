//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join(opts: { topic: PublicKey, peerId: PublicKey }): Promise<void>

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave(opts: { topic: PublicKey, peerId: PublicKey }): Promise<void>
}
