//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type AiToolNotFoundError, OpaqueToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { isTruthy } from '@dxos/util';

export type CreateToolkitProps = {
  toolkit?: OpaqueToolkit.Any;
  blueprints?: readonly Blueprint.Blueprint[];
  /**
   * Self-contained with handlers toolkits.
   */
  opaqueToolkits?: readonly OpaqueToolkit.Any[];
};

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 * Returns a resolved Toolkit.WithHandler for internal use.
 */
export const createToolkit = ({
  toolkit: toolkitProp,
  blueprints = [],
  opaqueToolkits = [],
}: CreateToolkitProps): Effect.Effect<
  Toolkit.WithHandler<any>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService | Tool.HandlersFor<any>
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolHandler = yield* blueprintToolkit.toContext(ToolExecutionService.handlersFor(blueprintToolkit));
    const opaqueToolkit = OpaqueToolkit.merge(...opaqueToolkits);

    const toolkitDefs = [toolkitProp?.toolkit, blueprintToolkit, opaqueToolkit.toolkit].filter(isTruthy);
    const toolkit = Toolkit.merge(...toolkitDefs);
    return yield* toolkit.pipe(
      Effect.provide(blueprintToolHandler),
      Effect.provide(toolkitProp?.layer ?? Layer.empty),
      Effect.provide(opaqueToolkit.layer),
    ) as any as Effect.Effect<Toolkit.WithHandler<any>, never, Tool.HandlersFor<any>>;
  });
