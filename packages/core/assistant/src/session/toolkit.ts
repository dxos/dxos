//
// Copyright 2025 DXOS.org
//

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
  ToolResolverService | ToolExecutionService
> =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolHandler = yield* blueprintToolkit.toContext(ToolExecutionService.handlersFor(blueprintToolkit));
    const opaqueToolkit = OpaqueToolkit.merge(...opaqueToolkits);

    const toolkitDefs = [toolkitProp?.toolkit, blueprintToolkit, opaqueToolkit.toolkit].filter(isTruthy);
    const mergedToolkit = Toolkit.merge(...toolkitDefs);
    const combinedHandlerLayer = Layer.mergeAll(
      Layer.succeedContext(blueprintToolHandler),
      toolkitProp?.layer ?? OpaqueToolkit.empty.layer,
      opaqueToolkit.layer,
    );
    return OpaqueToolkit.make(mergedToolkit, combinedHandlerLayer as any) as OpaqueToolkit.OpaqueToolkit<never, any>;
  }) as Effect.Effect<
    OpaqueToolkit.OpaqueToolkit<never, any>,
    AiToolNotFoundError,
    ToolResolverService | ToolExecutionService
  >;
