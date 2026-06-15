//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, ModelName } from '@dxos/ai';
import { Routine, Trace, Operation } from '@dxos/compute';
import { Database, Feed, Ref, Registry } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Text } from '@dxos/schema';

import * as Chat from '../../types/Chat';

// TODO(dmaretskyi): Rename to RunRoutine.
export const AgentPrompt = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.prompt'),
    name: 'Run Routine',
    description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    prompt: Ref.Ref(Routine.Routine),

    /**
     * When set, runs in this chat (history, queue, and bound context). Routine blueprints and context objects are merged into the conversation for this request.
     */
    chat: Schema.optional(Ref.Ref(Chat.Chat)),

    /**
     * @default ai.claude.model.claude-opus-4-6
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
  // ECHO types that the handler loads via Database.load(). Declaring them here ensures the
  // runtime registers their schema before remote invocation (e.g. via the EDGE function service).
  types: [Routine.Routine, Text.Text, Feed.Feed, Chat.Chat],
  services: [
    AiService.AiService,
    Database.Service,
    Feed.FeedService,
    OpaqueToolkit.OpaqueToolkitProvider,
    Registry.Service,
    Trace.TraceService,
  ],
});
