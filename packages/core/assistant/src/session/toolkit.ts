//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type AiToolNotFoundError, ToolExecutionService, type ToolId, ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { isTruthy } from '@dxos/util';

export type CreateToolkitParams<Tools extends Record<string, Tool.Any>> = {
  toolkit?: Toolkit.Toolkit<Tools>;
  toolIds?: ToolId[]; // TODO(burdon): Remove?
  blueprints?: Blueprint.Blueprint[];
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = <Tools extends Record<string, Tool.Any> = {}>({
  toolkit: toolkitParam,
  toolIds = [],
  blueprints = [],
}: CreateToolkitParams<Tools>): Effect.Effect<
  Toolkit.WithHandler<Tools>,
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

    const toolkit = Toolkit.merge(...[toolkitParam, blueprintToolkit].filter(isTruthy));
    return yield* toolkit.pipe(Effect.provide(blueprintToolkitHandler)) as any as Effect.Effect<
      Toolkit.WithHandler<Tools>,
      never,
      Tool.HandlersFor<Tools>
    >;
  });
