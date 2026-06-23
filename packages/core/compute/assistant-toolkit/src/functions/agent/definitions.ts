//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, ModelName } from '@dxos/ai';
import { Instructions, Trace, Operation } from '@dxos/compute';
import { Database, Feed, Ref, Registry } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Text } from '@dxos/schema';

import * as Chat from '../../types/Chat';

export const RunInstructions = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.runInstructions'),
    name: 'Run Instructions',
    description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    instructions: Ref.Ref(Instructions.Instructions),

    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Any.pipe(Schema.annotations({ title: 'Input' })),

    /**
     * When set, runs in this chat (history, queue, and bound context). Routine blueprints and context objects are merged into the conversation for this request.
     */
    chat: Schema.optional(Ref.Ref(Chat.Chat)),

    /**
     * @default ai.claude.model.claude-opus-4-8
     */
    model: Schema.optional(ModelName),

    systemInstructions: Schema.optional(Schema.String).annotations({
      description: 'Additional system instructions to add to the system prompt.',
    }),
  }),
  output: Schema.Any,
  // ECHO types that the handler loads via Database.load(). Declaring them here ensures the
  // runtime registers their schema before remote invocation (e.g. via the EDGE function service).
  types: [Instructions.Instructions, Text.Text, Feed.Feed, Chat.Chat],
  services: [
    AiService.AiService,
    Database.Service,
    OpaqueToolkit.OpaqueToolkitProvider,
    Registry.Service,
    Trace.TraceService,
  ],
});
