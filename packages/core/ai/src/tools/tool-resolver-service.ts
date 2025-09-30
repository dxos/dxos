//
// Copyright 2025 DXOS.org
//

import { type Tool, Toolkit } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

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
      const tools = yield* Effect.all(ids.map(ToolResolverService.resolve));
      return AiToolkit.make(...tools);
    });
}
