//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type AiToolNotFoundError, OpaqueToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { type Skill } from '@dxos/compute';
import { isTruthy } from '@dxos/util';

export type CreateToolkitProps = {
  toolkit?: OpaqueToolkit.Any;
  skills?: readonly Skill.Skill[];
  /**
   * Self-contained with handlers toolkits.
   */
  opaqueToolkits?: readonly OpaqueToolkit.Any[];
};

/**
 * Build a combined toolkit from the skill tools and the provided toolkit.
 */
export const createToolkit = ({
  toolkit: toolkitProp,
  skills = [],
  opaqueToolkits = [],
}: CreateToolkitProps): Effect.Effect<
  OpaqueToolkit.OpaqueToolkit,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService
> =>
  Effect.gen(function* () {
    const skillToolkit = yield* ToolResolverService.resolveToolkit(skills.flatMap(({ tools }) => tools));
    const skillToolHandler = yield* skillToolkit.toContext(ToolExecutionService.handlersFor(skillToolkit));
    const opaqueToolkit = OpaqueToolkit.merge(...opaqueToolkits);

    const toolkitDefs = [toolkitProp?.toolkit, skillToolkit, opaqueToolkit.toolkit].filter(isTruthy);
    const mergedToolkit = Toolkit.merge(...toolkitDefs);
    const combinedHandlerLayer = Layer.mergeAll(
      Layer.succeedContext(skillToolHandler),
      toolkitProp?.layer ?? OpaqueToolkit.empty.layer,
      opaqueToolkit.layer,
    );
    return OpaqueToolkit.make(mergedToolkit, combinedHandlerLayer as any) as OpaqueToolkit.OpaqueToolkit;
  }) as Effect.Effect<OpaqueToolkit.OpaqueToolkit, AiToolNotFoundError, ToolResolverService | ToolExecutionService>;
