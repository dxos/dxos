//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { log } from '@dxos/log';

import { AiToolNotFoundError } from '../errors.ts';
import { type ToolId } from './tool.ts';

/**
 * Resolves tool definitions.
 * Also is able to resolve tools backed by functions.
 */
export class ToolResolverService extends Context.Service<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<Tool.Any, AiToolNotFoundError>;
  }
>()('@dxos/ai/ToolResolverService') {
  static layerEmpty = Layer.succeed(ToolResolverService, {
    resolve: (id) => Effect.fail(new AiToolNotFoundError(id)),
  });

  static resolve: (id: ToolId) => Effect.Effect<Tool.Any, AiToolNotFoundError, ToolResolverService> = (id) =>
    ToolResolverService.use((service) => service.resolve(id));

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<Toolkit.Toolkit<Record<string, Tool.Any>>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const tools = yield* Effect.forEach(ids, (id) =>
        ToolResolverService.resolve(id).pipe(
          // A resolver may throw rather than fail — an operation whose persisted schema cannot be
          // projected to tool parameters is the common case. A defect would abort the whole request
          // over one bad tool, so it is demoted to the not-found failure the filter below drops.
          Effect.catchDefect((defect) => {
            log.error('AI tool resolution failed; excluded from context', { id, defect });
            return Effect.fail(new AiToolNotFoundError(id));
          }),
          Effect.tapErrorTag('AiToolNotFoundError', (error) =>
            Effect.sync(() => {
              log.warn('Failed to resolve AI tool', { id, error });
              return Effect.void;
            }),
          ),
          Effect.result,
        ),
      ).pipe(Effect.map((results) => Array.filterMap(results, (result) => result)));

      return Toolkit.make(...tools);
    });
}
