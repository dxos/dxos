//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { GeneratorAnnotation } from '@dxos/echo-schema';
import { ObjectId } from '@dxos/keys';

/**
 * AI agents self-reporting their current status.
 * This gets written to the tracing queue.
 *
 * LLMs are prompted to emit <status>Brewing tea</status> tokens during their execution to notify the client of their current status.
 */
export const AgentStatus = Schema.Struct({
  // See {@link TracingService.TraceContext}
  parentMessage: Schema.optional(ObjectId),
  toolCallId: Schema.optional(Schema.String),
  created: Schema.String.pipe(
    Schema.annotations({ description: 'ISO date string when the status was sent.' }),
    GeneratorAnnotation.set('date.iso8601'),
  ),
  message: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/AgentStatus',
    version: '0.1.0',
  }),
);
export interface AgentStatus extends Schema.Schema.Type<typeof AgentStatus> {}
