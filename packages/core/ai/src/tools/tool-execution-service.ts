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
    readonly handlersFor: <Tools extends Record<string, Tool.Any>>(
      toolkit: Toolkit.Toolkit<Tools>,
    ) => Toolkit.WithHandler<Tools>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolExecutionService, {
    handlersFor: (toolkit) =>
      toolkit.of(Record.map(toolkit.tools, (tool, name) => Effect.fail(new AiToolNotFoundError(name))) as any) as any,
  });

  static handlersFor = Effect.serviceFunction(ToolExecutionService, (_) => _.handlersFor);
}
