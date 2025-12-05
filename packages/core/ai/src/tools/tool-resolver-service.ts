//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';

import { log } from '@dxos/log';

import { AiToolNotFoundError } from '../errors';

import { type ToolId } from './tool';

export class ToolResolverService extends Context.Tag('@dxos/ai/ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<Tool.Any, AiToolNotFoundError>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolResolverService, {
    resolve: (id) => Effect.fail(new AiToolNotFoundError(id)),
  });

  static resolve: (id: ToolId) => Effect.Effect<Tool.Any, AiToolNotFoundError, ToolResolverService> =
    Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<Toolkit.Toolkit<any>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const tools = yield* Effect.forEach(ids, (id) =>
        ToolResolverService.resolve(id).pipe(
          Effect.tapErrorTag('AiToolNotFoundError', (error) =>
            Effect.sync(() => {
              log.warn('Failed to resolve AI tool', { id, error });
              return Effect.void;
            }),
          ),
          Effect.either,
        ),
      ).pipe(Effect.map(Array.filterMap(Either.getRight)));
      return Toolkit.make(...tools);
    });
}
