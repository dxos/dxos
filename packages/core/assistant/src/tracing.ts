//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { Trace } from '@dxos/functions';
import { ContentBlock, Actor } from '@dxos/types';

/**
 * Partial content block emitted.
 */
export const PartialBlock = Trace.EventType('assistant.partialBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: true,
});

/**
 * Complete content block emitted.
 */
export const CompleteBlock = Trace.EventType('assistant.completeBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: false,
});

export const AgentRequestBegin = Trace.EventType('assistant.agentRequestBegin', {
  schema: Schema.Struct({}),
  isEphemeral: false,
});

export const AgentRequestEnd = Trace.EventType('assistant.agentRequestEnd', {
  schema: Schema.Struct({}),
  isEphemeral: false,
});
