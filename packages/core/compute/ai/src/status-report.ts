//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Type } from '@dxos/echo';
import { EntityId } from '@dxos/keys';

/**
 * AI agents self-reporting their current status.
 * This gets written to the tracing queue.
 *
 * LLMs are prompted to emit <status>Brewing tea</status> tokens during their execution to notify the client of their current status.
 */
export class AgentStatus extends Type.makeObject<AgentStatus>(DXN.make('org.dxos.type.agentStatus', '0.1.0'))(
  Schema.Struct({
    parentMessage: Schema.optional(EntityId),
    toolCallId: Schema.optional(Schema.String),
    created: Schema.String.pipe(
      Schema.annotations({ description: 'ISO date string when the status was sent.' }),
      Annotation.GeneratorAnnotation.set('date.iso8601'),
    ),
    message: Schema.String,
  }),
) {}
