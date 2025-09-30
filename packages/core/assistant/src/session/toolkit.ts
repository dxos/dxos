//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { type Context, Effect } from 'effect';

import { ToolExecutionService, type ToolId, ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { isTruthy } from '@dxos/util';

export type ToolkitParams<Tools extends AiTool.Any> = {
  toolkit?: AiToolkit.AiToolkit<Tools>;
  toolIds?: ToolId[];
  blueprints?: Blueprint.Blueprint[];
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = <Tools extends AiTool.Any>({
  toolkit: toolkitParam,
  toolIds = [],
  blueprints = [],
}: ToolkitParams<Tools>) =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit([
      ...blueprints.flatMap(({ tools }) => tools),
      ...toolIds,
    ]);

    const blueprintToolkitHandler: Context.Context<AiTool.ToHandler<AiTool.Any>> = yield* blueprintToolkit.toContext(
      ToolExecutionService.handlersFor(blueprintToolkit),
    );

    const toolkit = AiToolkit.merge(...[toolkitParam, blueprintToolkit].filter(isTruthy));
    return yield* toolkit.pipe(Effect.provide(blueprintToolkitHandler)) as Effect.Effect<
      AiToolkit.ToHandler<any>,
      never,
      AiTool.ToHandler<Tools>
    >;
  });
