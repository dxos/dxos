//
// Copyright 2025 DXOS.org
//

import { type Tool, Toolkit } from '@effect/ai';
import { type Context, Effect } from 'effect';

import { type AiToolNotFoundError, ToolExecutionService, type ToolId, ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { isNotFalsy } from '@dxos/util';

export type ToolkitParams<Tools extends Record<string, Tool.Any>> = {
  toolkit?: Toolkit.Toolkit<Tools>;
  toolIds?: ToolId[];
  blueprints?: Blueprint.Blueprint[];
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = <Tools extends Record<string, Tool.Any> = {}>({
  toolkit: toolkitParam,
  toolIds = [],
  blueprints = [],
}: ToolkitParams<Tools>): Effect.Effect<
  Toolkit.WithHandler<any>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService | Tool.HandlersFor<Tools>
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit([
      ...blueprints.flatMap(({ tools }) => tools),
      ...toolIds,
    ]);

    const blueprintToolkitHandler: Context.Context<Tool.HandlersFor<any>> = yield* blueprintToolkit.toContext(
      ToolExecutionService.handlersFor(blueprintToolkit),
    );

    const toolkit = Toolkit.merge(...[toolkitParam, blueprintToolkit].filter(isNotFalsy));
    return yield* toolkit.pipe(Effect.provide(blueprintToolkitHandler)) as any as Effect.Effect<
      Toolkit.WithHandler<any>,
      never,
      Tool.HandlersFor<Tools>
    >;
  });
