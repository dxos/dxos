//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { ContentBlock } from '@dxos/types';

/**
 * Typed control surface on the live host process that owns a conversation's harness.
 *
 * The same group is declared as the agent process's `rpcs` (so its handlers run on the host's
 * server fiber with the live `AlarmManager`/`inputQueue` in scope) and used by {@link HarnessService}
 * Tier B to dispatch over the discovered host's `Handle.rpc` — keeping both ends on one contract.
 */
export const HarnessControl = RpcGroup.make(
  Rpc.make('setAlarm', {
    payload: Schema.Struct({ at: Schema.DateTimeUtc, message: Schema.NullOr(Schema.String) }),
    success: Schema.Void,
  }),
  Rpc.make('enqueueMessage', {
    payload: Schema.Struct({ content: Schema.Array(ContentBlock.Any) }),
    success: Schema.Void,
  }),
);

/** Union of the RPCs declared in {@link HarnessControl}. */
export type HarnessControlRpcs = RpcGroup.Rpcs<typeof HarnessControl>;
