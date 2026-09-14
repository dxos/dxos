//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import type * as Tool from 'effect/unstable/ai/Tool';
import type * as Toolkit from 'effect/unstable/ai/Toolkit';

import { AiToolNotFoundError } from '../errors.ts';

/**
 * Provides handlers for tools.
 */
export class ToolExecutionService extends Context.Service<
  ToolExecutionService,
  {
    readonly handlersFor: <Tools extends Record<string, Tool.Any>>(
      toolkit: Toolkit.Toolkit<Tools>,
    ) => Toolkit.HandlersFrom<Tools>;
  }
>()('@dxos/ai/ToolExecutionService') {
  static layerEmpty = Layer.succeed(ToolExecutionService, {
    // `toolkit.tools` covers every tool, while `HandlersFrom<Tools>` only requires entries for
    // tools that need a handler — a filtered mapped type `toolkit.of`'s generic `Tools` can't
    // verify against a runtime-built record, so the shape is asserted once at its source.
    handlersFor: <Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>) =>
      toolkit.of(
        Record.map(toolkit.tools, (tool, name) =>
          Effect.fail(new AiToolNotFoundError(name)),
        ) as unknown as Toolkit.HandlersFrom<Tools>,
      ),
  });

  static handlersFor = <Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>) =>
    ToolExecutionService.use((service) => Effect.succeed(service.handlersFor(toolkit)));
}
