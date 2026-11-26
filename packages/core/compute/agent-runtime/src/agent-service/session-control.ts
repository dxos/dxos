//
// Copyright 2026 DXOS.org
//

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { ContentBlock } from '@dxos/types';

/**
 * The control RPCs of a live session process: what every {@link SessionProcessDefinition} serves as its `rpcs`, so a
 * session drives whichever process runs it. Handlers run on the process's server fiber and write their durable effect,
 * a queued message or an alarm, to the conversation feed. `AgentService` calls them through the process handle's `rpc`.
 */
export const SessionControlRpcs = RpcGroup.make(
  Rpc.make('setAlarm', {
    payload: Schema.Struct({ at: Schema.DateTimeUtc, message: Schema.NullOr(Schema.String) }),
    success: Schema.Void,
  }),
  Rpc.make('enqueueMessage', {
    payload: Schema.Struct({ content: Schema.Array(ContentBlock.Any) }),
    success: Schema.Void,
  }),
);

/** Union of the RPCs declared in {@link SessionControlRpcs}. */
export type SessionControlRpc = RpcGroup.Rpcs<typeof SessionControlRpcs>;
