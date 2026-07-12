//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

export class TimingStatsSample extends Schema.Class<TimingStatsSample>('TimingStatsSample')({
  tag: Schema.String,
  queueWaitMs: Schema.optional(Schema.Number),
  serviceMs: Schema.Number,
  at: Schema.Number,
}) {}

export class TimingStatsSnapshot extends Schema.Class<TimingStatsSnapshot>('TimingStatsSnapshot')({
  samples: Schema.Array(TimingStatsSample),
  maxQueueWaitMs: Schema.Number,
  maxServiceMs: Schema.Number,
}) {}

/**
 * RPC surface for the shared-counter worker demo, including observability probes.
 */
export class CounterRpcs extends RpcGroup.make(
  Rpc.make('increment', {
    success: Schema.Number,
  }),
  Rpc.make('subscribe', {
    success: Schema.Number,
    stream: true,
  }),
  Rpc.make('ping', {
    success: Schema.Void,
  }),
  Rpc.make('getTimingStats', {
    success: TimingStatsSnapshot,
  }),
  Rpc.make('blockCpu', {
    payload: {
      durationMs: Schema.Number,
    },
    success: Schema.Number,
  }),
) {}
