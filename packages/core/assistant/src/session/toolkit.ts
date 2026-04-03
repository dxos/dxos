//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { type AiToolNotFoundError, GenericToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { type Blueprint, type Prompt } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { FunctionInvocationService, type InvocationServices } from '@dxos/functions';
import { isTruthy } from '@dxos/util';

export type CreateToolkitProps = {
  toolkit?: Toolkit.Any;
  blueprints?: readonly Blueprint.Blueprint[];
  /**
   * Sub-prompts that can be invoked as tools.
   */
  prompts?: readonly Prompt.Prompt[];
  /**
   * Self-contained with handlers toolkits.
   */
  genericToolkits?: readonly GenericToolkit.GenericToolkit[];
};

/**
 * Creates a tool name from a prompt.
 */
const promptToolName = (prompt: Prompt.Prompt): string => {
  const name = prompt.name ?? prompt.id;
  return `prompt_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
};

/**
 * Creates a GenericToolkit from prompts.
 * Each prompt becomes a tool that invokes the AgentPrompt operation.
 */
export const createPromptToolkit = (prompts: readonly Prompt.Prompt[]): GenericToolkit.GenericToolkit => {
  if (prompts.length === 0) {
    return GenericToolkit.empty;
  }

  const tools = prompts.map((prompt) =>
    Tool.make(promptToolName(prompt), {
      description: prompt.description ?? `Execute the "${prompt.name ?? prompt.id}" prompt.`,
      parameters: {
        input: Schema.Any.annotations({
          description: 'Input data to pass to the prompt.',
        }),
      },
      success: Schema.Any,
      failure: Schema.Never,
    }),
  );

  const toolkit = Toolkit.make(...tools);

  const handlers: Record<
    string,
    (params: { input: any }) => Effect.Effect<any, never, FunctionInvocationService | InvocationServices>
  > = {};
  for (const prompt of prompts) {
    const toolName = promptToolName(prompt);
    handlers[toolName] = ({ input }) =>
      FunctionInvocationService.invokeFunction(
        {
          meta: { key: 'org.dxos.function.prompt' },
          input: Schema.Any,
          output: Schema.Any,
        } as any,
        {
          prompt: Ref.make(prompt),
          input,
        },
      );
  }

  const layer = toolkit.toLayer(handlers as any) as Layer.Layer<
    any,
    never,
    FunctionInvocationService | InvocationServices
  >;

  return GenericToolkit.make(toolkit, layer) as GenericToolkit.GenericToolkit;
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = ({
  toolkit: toolkitProp,
  blueprints = [],
  prompts = [],
  genericToolkits = [],
}: CreateToolkitProps): Effect.Effect<
  Toolkit.WithHandler<any>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService | Tool.HandlersFor<any>
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolHandler = yield* blueprintToolkit.toContext(ToolExecutionService.handlersFor(blueprintToolkit));
    const promptToolkit = createPromptToolkit(prompts);
    const genericToolkit = GenericToolkit.merge(promptToolkit, ...genericToolkits);

    const toolkit = Toolkit.merge(...[toolkitProp, blueprintToolkit, genericToolkit.toolkit].filter(isTruthy));
    return yield* toolkit.pipe(
      Effect.provide(blueprintToolHandler),
      Effect.provide(genericToolkit.layer),
    ) as any as Effect.Effect<Toolkit.WithHandler<any>, never, Tool.HandlersFor<any>>;
  });
