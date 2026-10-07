//
// Copyright 2022 DXOS.org
//

import { type MaybePromise } from '@dxos/util';

/**
 * Interface for a transport-agnostic port to send/receive binary messages.
 *
 * NOTE: Copied from @dxos/rpc to avoid dependency. Structural typing should still work.
 */
export interface RpcPort {
  /**
   * `timeout` bounds this message's own send; a message written while frames buffered before the channel
   * opened are still flushing waits for them first, outside that bound.
   */
  send: (msg: Uint8Array, timeout?: number) => MaybePromise<void>;
  subscribe: (cb: (msg: Uint8Array) => void) => (() => void) | void;
}
