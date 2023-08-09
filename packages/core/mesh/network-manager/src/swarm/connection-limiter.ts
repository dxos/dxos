//
// Copyright 2023 DXOS.org
//

export const MAX_INITIATING_CONNECTIONS = 15;

export interface ConnectionLimiter {
  /**
   * Waits while the number of connections is less than the limit.
   */
  wait(): Promise<void>;
}
