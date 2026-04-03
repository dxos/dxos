//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/functions';
import { Obj } from '@dxos/echo';
import { ContentBlock, Actor } from '@dxos/types';
import * as Schema from 'effect/Schema';

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
