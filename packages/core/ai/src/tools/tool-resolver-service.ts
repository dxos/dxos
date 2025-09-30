//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { type ToolId } from './tool';

export class ToolResolverService extends Context.Tag('@dxos/ai/ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<AiTool.Any | void>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolResolverService, {
    resolve: () => Effect.void,
  });

  static resolve = Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (ids: ToolId[]) => Effect.Effect<AiToolkit.AiToolkit<AiTool.Any>, never, ToolResolverService> =
    (ids) =>
      Effect.gen(function* () {
        const tools = yield* Effect.all(ids.map(ToolResolverService.resolve));
        return AiToolkit.make(...tools.filter((tool) => tool !== undefined));
      });
}
