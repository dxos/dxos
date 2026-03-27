//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { Process } from '@dxos/functions-runtime';
import { Message } from '@dxos/types';

import { AiSession, type AiSessionRunRequirements } from '../session';

/**
 * Options for creating an AI agent executable.
 */
export interface AgentExecutableOptions<Tools extends Record<string, Tool.Any> = Record<string, Tool.Any>> {
  /** System prompt for the agent. */
  system?: string;
  /** Pre-resolved toolkit with handlers. Obtain via `yield* MyToolkit` in an Effect context. */
  toolkit?: Toolkit.WithHandler<Tools>;
  /** Token threshold for history summarization. */
  summarizationThreshold?: number;
}

/**
 * Creates a Process.Executable that wraps an AiSession.
 *
 * The executable maintains conversation history across inputs.
 * Each `handleInput` call runs one AiSession turn (including tool call loops).
 *
 * Input: string prompts.
 * Output: Message.Message objects produced by the session.
 *
 * Required services: LanguageModel, ToolExecutionService, ToolResolverService, TracingService, FunctionInvocationService.
 */
export const makeAgentExecutable = <Tools extends Record<string, Tool.Any>>(
  options: AgentExecutableOptions<Tools> = {},
) =>
  Process.makeExecutable(
    {
      input: Schema.String,
      output: Schema.Any,
      services: [
        LanguageModel.LanguageModel as any,
        ToolExecutionService,
        ToolResolverService,
        TracingService,
        FunctionInvocationService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<AiSessionRunRequirements>();
        const session = new AiSession({
          summarizationThreshold: options.summarizationThreshold,
        });
        const history: Message.Message[] = [];

        return {
          init: () => Effect.void,
          handleInput: (prompt: string) =>
            Effect.gen(function* () {
              const messages = yield* session
                .run({
                  history,
                  prompt,
                  toolkit: options.toolkit,
                  system: options.system,
                })
                .pipe(Effect.provide(runtime), Effect.orDie);
              history.push(...messages);
              for (const message of messages) {
                ctx.submitOutput(message);
              }
            }),
          alarm: () => Effect.void,
          childEvent: () => Effect.void,
        };
      }),
  );
