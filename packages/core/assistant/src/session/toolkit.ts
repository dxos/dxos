//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { type AiToolNotFoundError, GenericToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { isTruthy } from '@dxos/util';

export type CreateToolkitProps = {
  toolkit?: Toolkit.Any;
  blueprints?: readonly Blueprint.Blueprint[];
  /**
   * Self-contained with handlers toolkits.
   */
  genericToolkits?: readonly GenericToolkit.GenericToolkit[];
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = ({
  toolkit: toolkitProp,
  blueprints = [],
  genericToolkits = [],
}: CreateToolkitProps): Effect.Effect<
  Toolkit.WithHandler<any>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService | Tool.HandlersFor<any>
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolHandler = yield* blueprintToolkit.toContext(ToolExecutionService.handlersFor(blueprintToolkit));
    const genericToolkit = GenericToolkit.merge(...genericToolkits);

    const toolkit = Toolkit.merge(...[toolkitProp, blueprintToolkit, genericToolkit.toolkit].filter(isTruthy));
    return yield* toolkit.pipe(
      Effect.provide(blueprintToolHandler),
      Effect.provide(genericToolkit.layer),
    ) as any as Effect.Effect<Toolkit.WithHandler<any>, never, Tool.HandlersFor<any>>;
  });
