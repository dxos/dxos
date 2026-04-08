//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, ModelName, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { Prompt } from '@dxos/blueprints';
import { Database, Feed, Ref } from '@dxos/echo';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import * as Chat from '../../types/Chat';

export const AgentPrompt = Operation.make({
  meta: {
    key: 'org.dxos.function.prompt',
    name: 'Agent',
    description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  },
  input: Schema.Struct({
    prompt: Ref.Ref(Prompt.Prompt),

    // TODO(dmaretskyi): Remove.
    systemPrompt: Schema.optional(Ref.Ref(Prompt.Prompt)),

    /**
     * When set, runs in this chat (history, queue, and bound context). Prompt blueprints and context objects are merged into the conversation for this request.
     */
    chat: Schema.optional(Ref.Ref(Chat.Chat)),

    /**
     * @default @anthropic/claude-opus-4-0
     */

    model: Schema.optional(ModelName),
    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Any.pipe(Schema.annotations({ title: 'Input' })),
  }),
  output: Schema.Any,
  services: [
    AiService.AiService,
    Database.Service,
    Feed.FeedService,
    TracingService,
    ToolExecutionService,
    ToolResolverService,
    FunctionInvocationService,
  ],
});
