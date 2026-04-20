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
 */
export const createToolkit = ({
  toolkit: toolkitProp,
  blueprints = [],
  opaqueToolkits = [],
}: CreateToolkitProps): Effect.Effect<
  OpaqueToolkit.OpaqueToolkit<never, any>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService | Tool.HandlersFor<any>
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolHandler = yield* blueprintToolkit.toContext(ToolExecutionService.handlersFor(blueprintToolkit));
    const opaqueToolkit = OpaqueToolkit.merge(...opaqueToolkits);

    const toolkitDefs = [toolkitProp?.toolkit, blueprintToolkit, opaqueToolkit.toolkit].filter(isTruthy);
    const mergedToolkit = Toolkit.merge(...toolkitDefs);
    const resolved = yield* mergedToolkit.pipe(
      Effect.provide(Layer.succeedContext(blueprintToolHandler)),
      Effect.provide(toolkitProp?.layer ?? OpaqueToolkit.empty.layer),
      Effect.provide(opaqueToolkit.layer),
    );
    return OpaqueToolkit.make(
      mergedToolkit,
      mergedToolkit.toLayer(resolved as any),
    ) as unknown as OpaqueToolkit.OpaqueToolkit<never, any>;
  }) as Effect.Effect<
    OpaqueToolkit.OpaqueToolkit<never, any>,
    AiToolNotFoundError,
    ToolResolverService | ToolExecutionService | Tool.HandlersFor<any>
  >;
