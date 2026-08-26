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
    const combinedHandlerLayer = Layer.mergeAll(
      Layer.succeedContext(skillToolHandler),
      toolkitProp?.layer ?? OpaqueToolkit.empty.layer,
      opaqueToolkit.layer,
    );
    return OpaqueToolkit.make(mergedToolkit, combinedHandlerLayer as any) as OpaqueToolkit.OpaqueToolkit;
  }) as Effect.Effect<OpaqueToolkit.OpaqueToolkit, AiToolNotFoundError, ToolResolverService | ToolExecutionService>;
