//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService, ModelName, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { Prompt } from '@dxos/blueprints';
import { Database, Ref } from '@dxos/echo';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

export const AgentPrompt = Operation.make({
  meta: {
    key: 'org.dxos.function.prompt',
    name: 'Agent',
    description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  },
  input: Schema.Struct({
    prompt: Ref.Ref(Prompt.Prompt),
    systemPrompt: Schema.optional(Ref.Ref(Prompt.Prompt)),
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
    TracingService,
    ToolExecutionService,
    ToolResolverService,
    FunctionInvocationService,
  ],
});
