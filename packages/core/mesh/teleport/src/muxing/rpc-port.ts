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
  send: (msg: Uint8Array, timeout?: number) => MaybePromise<void>;
  subscribe: (cb: (msg: Uint8Array) => void) => (() => void) | void;
}
