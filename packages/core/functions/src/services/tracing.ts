//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { AgentStatus } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { ObjectId } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

/**
 * Provides a way for compute primitives (functions, workflows, tools)
 * to emit an execution trace as a series of structured ECHO objects.
 */
export class TracingService extends Context.Tag('@dxos/functions/TracingService')<
  TracingService,
  {
    /**
     * Gets the parent message ID.
     */
    getParentMessage: () => ObjectId | undefined;

    /**
     * Write an event to the tracing queue.
     * @param event - The event to write. Must be an a typed object.
     */
    write: (event: Obj.Any) => void;
  }
>() {
  static noop: Context.Tag.Service<TracingService> = { write: () => {}, getParentMessage: () => undefined };

  static layerNoop = Layer.succeed(TracingService, TracingService.noop);

  static console: Context.Tag.Service<TracingService> = {
    write: (event) => {
      // eslint-disable-next-line no-console
      console.log(event);
    },
    getParentMessage: () => undefined,
  };

  static layerConsole = Layer.succeed(TracingService, TracingService.console);

  /**
   * Creates a TracingService layer that emits events to the parent tracing service.
   */
  static layerSubframe = ({ parentMessage }: { parentMessage: ObjectId }) =>
    Layer.effect(
      TracingService,
      Effect.gen(function* () {
        const tracing = yield* TracingService;
        return {
          write: (event) => tracing.write(event),
          getParentMessage: () => parentMessage,
        };
      }),
    );

  static layerQueue = (queue: Queue) =>
    Layer.effect(
      TracingService,
      Effect.gen(function* () {
        // TODO(dmaretskyi): Batching.
        return {
          write: (event) => queue.append([event]),
          getParentMessage: () => undefined,
        };
      }),
    );

  /**
   * Emit the current human-readable execution status.
   */
  static emitStatus: (data: Obj.MakeProps<typeof AgentStatus>) => Effect.Effect<void, never, TracingService> =
    Effect.fnUntraced(function* (data) {
      const tracing = yield* TracingService;
      tracing.write(
        Obj.make(AgentStatus, {
          parentMessage: tracing.getParentMessage(),
          ...data,
        }),
      );
    });

  static emitConverationMessage: (
    data: Obj.MakeProps<typeof DataType.Message>,
  ) => Effect.Effect<void, never, TracingService> = Effect.fnUntraced(function* (data) {
    const tracing = yield* TracingService;
    tracing.write(
      Obj.make(DataType.Message, {
        parentMessage: tracing.getParentMessage(),
        ...data,
      }),
    );
  });
}
