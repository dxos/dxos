//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { log } from '@dxos/log';

import { AiToolNotFoundError } from '../errors';

import { type ToolId } from './tool';

export class ToolResolverService extends Context.Tag('@dxos/ai/ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<AiTool.Any, AiToolNotFoundError>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolResolverService, {
    resolve: (id) => Effect.fail(new AiToolNotFoundError(id)),
  });

  static resolve = Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<AiToolkit.AiToolkit<AiTool.Any>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const maybeTools = yield* Effect.forEach(ids, (id) =>
        ToolResolverService.resolve(id).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => {
              log.warn('Failed to resolve AI tool', { id, error });
              return undefined;
            }),
          ),
        ),
      );
      const tools = maybeTools.filter((t): t is AiTool.Any => t != null) as unknown as AiTool.Any[];
      return AiToolkit.make(...tools);
    });
}
