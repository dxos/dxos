//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { type AiToolNotFoundError, OpaqueToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import type * as Skill from '@dxos/compute/Skill';
import { invariant } from '@dxos/invariant';
import { isTruthy } from '@dxos/util';

export type CreateToolkitProps<E = never, R = never> = {
  toolkit?: OpaqueToolkit.Any<E, R>;
  skills?: readonly Skill.Skill[];
  /**
   * Self-contained with handlers toolkits.
   */
  opaqueToolkits?: readonly OpaqueToolkit.Any<E, R>[];
};

/**
 * Build a combined toolkit from the skill tools and the provided toolkit.
 */
export const createToolkit = <E = never, R = never>({
  toolkit: toolkitProp,
  skills = [],
  opaqueToolkits = [],
}: CreateToolkitProps<E, R>): Effect.Effect<
  OpaqueToolkit.OpaqueToolkit<never, E, R>,
  AiToolNotFoundError,
  ToolResolverService | ToolExecutionService
> =>
  Effect.gen(function* () {
    // Dedupe: two skills binding the same operation share one tool name and one tool.
    const toolIds = [...new Set(skills.flatMap(({ tools }) => tools))];
    const skillToolkit = yield* ToolResolverService.resolveToolkit(toolIds);
    const skillToolHandler = yield* skillToolkit.toHandlers(ToolExecutionService.handlersFor(skillToolkit));
    const opaqueToolkit = OpaqueToolkit.merge(...opaqueToolkits);

    const toolkitDefs = [toolkitProp?.toolkit, skillToolkit, opaqueToolkit.toolkit].filter(isTruthy);
    // Tool names are key-derived and registry-unique, so a duplicate here is a distinct tool being
    // silently shadowed by the merge below — fail loudly instead.
    const toolNames = toolkitDefs.flatMap((def) => Object.keys(def.tools));
    const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
    invariant(duplicates.length === 0, `Duplicate tool names in session toolkit: ${duplicates.join(', ')}`);
    const mergedToolkit = Toolkit.merge(...toolkitDefs);
    const combinedHandlerLayer = Layer.succeedContext(skillToolHandler).pipe(
      Layer.provideMerge(toolkitProp?.layer ?? OpaqueToolkit.empty.layer),
      Layer.provideMerge(opaqueToolkit.layer),
    );
    return OpaqueToolkit.make(mergedToolkit, combinedHandlerLayer);
  });
