//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { type Context, Effect } from 'effect';

import { ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { isNotFalsy } from '@dxos/util';

import { type SessionRunParams } from './session';

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = <Tools extends AiTool.Any>({
  blueprints = [],
  toolkit,
}: Pick<SessionRunParams<Tools>, 'blueprints' | 'toolkit'>) =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolkitHandler: Context.Context<AiTool.ToHandler<AiTool.Any>> = yield* blueprintToolkit.toContext(
      ToolExecutionService.handlersFor(blueprintToolkit),
    );

    return yield* AiToolkit.merge(...[toolkit, blueprintToolkit].filter(isNotFalsy)).pipe(
      Effect.provide(blueprintToolkitHandler),
    ) as Effect.Effect<AiToolkit.ToHandler<any>, never, AiTool.ToHandler<Tools>>;
  });
