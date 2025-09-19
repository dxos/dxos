//
// Copyright 2025 DXOS.org
//

import { type Tool, type Toolkit } from '@effect/ai';
import { Context, Effect, Layer, Record } from 'effect';

import { AiToolNotFoundError } from '../errors';

/**
 *
 */
// TODO(burdon): Comment.
export class ToolExecutionService extends Context.Tag('@dxos/ai/ToolExecutionService')<
  ToolExecutionService,
  {
    readonly handlersFor: <Tools extends Tool.Any>(toolkit: Toolkit.Toolkit<Tools>) => Tool.ToHandler<Tools>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolExecutionService, {
    handlersFor: (toolkit) =>
      toolkit.of(
        Record.map(toolkit.tools, (tool, name) =>
          Effect.fail(new AiToolNotFoundError(`Tool not found: ${name}`)),
        ) as any,
      ) as any,
  });

  static handlersFor = Effect.serviceFunction(ToolExecutionService, (_) => _.handlersFor);
}
