//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { EchoObject } from '@dxos/echo-schema';
import { Obj } from '@dxos/echo';

/**
 * AI agents self-reporting their current status.
 * This gets written to the tracing queue.
 *
 * LLMs are prompted to emit <status>Brewing tea</status> tokens during their execution to notify the client of their current status.
 */
export const AgentStatus = Schema.Struct({
  message: Schema.String,
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/AgentStatus',
    version: '0.1.0',
  }),
);
export interface AgentStatus extends Schema.Schema.Type<typeof AgentStatus> {}
