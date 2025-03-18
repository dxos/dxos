//
// Copyright 2020 DXOS.org
//

import { type LeaveRequest, type JoinRequest } from '@dxos/messaging';

/**
 * Signal peer discovery interface.
 */
export interface SignalConnection {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join(params: JoinRequest): Promise<void>;

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave(params: LeaveRequest): Promise<void>;
}
