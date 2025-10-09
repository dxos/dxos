//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { AgentStatus } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import type { ObjectId } from '@dxos/echo/internal';
import { log } from '@dxos/log';
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
    getTraceContext: () => TracingService.TraceContext;

    /**
     * Write an event to the tracing queue.
     * @param event - The event to write. Must be an a typed object.
     */
    write: (event: Obj.Any) => void;
  }
>() {
  static noop: Context.Tag.Service<TracingService> = { write: () => {}, getTraceContext: () => ({}) };

  static layerNoop = Layer.succeed(TracingService, TracingService.noop);

  static console: Context.Tag.Service<TracingService> = {
    write: (event) => {
      console.log(event);
    },
    getTraceContext: () => ({}),
  };

  static layerConsole = Layer.succeed(TracingService, TracingService.console);

  static layerLogInfo = () =>
    Layer.succeed(TracingService, {
      write: (event) => {
        if (Obj.instanceOf(AgentStatus, event)) {
          log.info('status', { message: event.message });
        }
      },
      getTraceContext: () => ({}),
    });

  /**
   * Creates a TracingService layer that emits events to the parent tracing service.
   */
  static layerSubframe = (mapContext: (currentContext: TracingService.TraceContext) => TracingService.TraceContext) =>
    Layer.effect(
      TracingService,
      Effect.gen(function* () {
        const tracing = yield* TracingService;
        const context = mapContext(tracing.getTraceContext());
        return {
          write: (event) => tracing.write(event),
          getTraceContext: () => context,
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
          getTraceContext: () => ({
            debugInfo: {
              queue: queue.dxn.toString(),
            },
          }),
        };
      }),
    );

  /**
   * Emit the current human-readable execution status.
   */
  static emitStatus: (
    data: Omit<Obj.MakeProps<typeof AgentStatus>, 'created'>,
  ) => Effect.Effect<void, never, TracingService> = Effect.fnUntraced(function* (data) {
    const tracing = yield* TracingService;
    tracing.write(
      Obj.make(AgentStatus, {
        parentMessage: tracing.getTraceContext().parentMessage,
        toolCallId: tracing.getTraceContext().toolCallId,
        created: new Date().toISOString(),
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
        parentMessage: tracing.getTraceContext().parentMessage,
        ...data,
        properties: {
          [MESSAGE_PROPERTY_TOOL_CALL_ID]: tracing.getTraceContext().toolCallId,
          ...data.properties,
        },
      }),
    );
  });
}

export namespace TracingService {
  export interface TraceContext {
    /**
     * If this thread sprung from a tool call, this is the ID of the message containing the tool call.
     */
    parentMessage?: ObjectId;

    /**
     * If the current thread is a byproduct of a tool call, this is the ID of the tool call.
     */
    toolCallId?: string;

    debugInfo?: unknown;
  }
}

/**
 * Goes into {@link DataType.Message['properties']}
 */
export const MESSAGE_PROPERTY_TOOL_CALL_ID = 'toolCallId' as const;
