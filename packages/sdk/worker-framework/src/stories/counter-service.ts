//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

/**
 * Minimal RPC surface for the shared-counter worker demo.
 */
export class CounterRpcs extends RpcGroup.make(
  Rpc.make('increment', {
    success: Schema.Number,
  }),
  Rpc.make('subscribe', {
    success: Schema.Number,
    stream: true,
  }),
) {}
