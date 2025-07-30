//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { AgentStatus } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import type { AnyEchoObject } from '@dxos/echo-schema';

/**
 * Provides a way for compute primitives (functions, workflows, tools)
 * to emit an execution trace as a series of structured ECHO objects.
 */
export class TracingService extends Context.Tag('TracingService')<
  TracingService,
  {
    /**
     * Write an event to the tracing queue.
     * @param event - The event to write. Must be an a typed object.
     */
    write(event: AnyEchoObject): void;
  }
>() {
  static noop: Context.Tag.Service<TracingService> = { write: () => {} };

  static layerNoop = Layer.succeed(TracingService, TracingService.noop);

  static console: Context.Tag.Service<TracingService> = {
    write: (event) => {
      // eslint-disable-next-line no-console
      console.log(event);
    },
  };

  /**
   * Emit the current human-readable execution status.
   */
  static emitStatus: (data: Obj.MakeProps<typeof AgentStatus>) => Effect.Effect<unknown, never, void> =
    Effect.fnUntraced(function* (data) {
      const tracing = yield* TracingService;
      tracing.write(Obj.make(AgentStatus, data));
    });
}
