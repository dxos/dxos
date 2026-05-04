//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, ModelName } from '@dxos/ai';
import { Routine } from '@dxos/compute';
import { Trace } from '@dxos/compute';
import { Operation, OperationRegistry } from '@dxos/compute';
import { Database, Feed, Ref } from '@dxos/echo';
import { ProcessManager } from '@dxos/functions-runtime';

import * as Chat from '../../types/Chat';

export const AgentPrompt = Operation.make({
  meta: {
    key: 'org.dxos.function.prompt',
    name: 'Agent',
    description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  },
  input: Schema.Struct({
    prompt: Ref.Ref(Routine.Routine),

    /**
     * When set, runs in this chat (history, queue, and bound context). Routine blueprints and context objects are merged into the conversation for this request.
     */
    chat: Schema.optional(Ref.Ref(Chat.Chat)),

    /**
     * @default @anthropic/claude-opus-4-6
     */

    model: Schema.optional(ModelName),
    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Any.pipe(Schema.annotations({ title: 'Input' })),

    systemInstructions: Schema.optional(Schema.String).annotations({
      description: 'Additional system instructions to add to the system prompt.',
    }),
  }),
  output: Schema.Any,
  services: [
    AiService.AiService,
    Database.Service,
    Feed.FeedService,
    OpaqueToolkit.OpaqueToolkitProvider,
    OperationRegistry.Service,
    Trace.TraceService,
    ProcessManager.Service,
  ],
});
