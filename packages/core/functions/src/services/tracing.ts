//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AgentStatus } from '@dxos/ai';
import { type DXN, Obj } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { Message } from '@dxos/types';

import type { Trigger } from '../types';

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
    write: (event: Obj.Any, traceContext: TracingService.TraceContext) => void;

    traceInvocationStart({
      payload,
      target,
    }: {
      payload: TracingService.FunctionInvocationPayload;
      target?: DXN;
    }): Effect.Effect<TracingService.InvocationTraceData>;

    traceInvocationEnd({
      trace,
      exception,
    }: {
      trace: TracingService.InvocationTraceData;
      exception?: any;
    }): Effect.Effect<void>;
  }
>() {
  static noop: Context.Tag.Service<TracingService> = {
    getTraceContext: () => ({}),
    write: () => {},
    traceInvocationStart: () =>
      Effect.sync(() => ({ invocationId: ObjectId.random(), invocationTraceQueue: undefined })),
    traceInvocationEnd: () => Effect.sync(() => {}),
  };

  static layerNoop: Layer.Layer<TracingService> = Layer.succeed(TracingService, TracingService.noop);

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
          write: (event, context) => tracing.write(event, context),
          getTraceContext: () => context,
          traceInvocationStart: () => Effect.die('Tracing invocation inside another invocation is not supported.'),
          traceInvocationEnd: () => Effect.die('Tracing invocation inside another invocation is not supported.'),
        };
      }),
    );

  /**
   * Create sublayer to trace an invocation.
   * @param data
   * @returns
   */
  static layerInvocation = (data: TracingService.InvocationTraceData) =>
    TracingService.layerSubframe((context) => ({
      ...context,
      currentInvocation: data,
    }));

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
      tracing.getTraceContext(),
    );
  });

  static emitConverationMessage: (
    data: Obj.MakeProps<typeof Message.Message>,
  ) => Effect.Effect<void, never, TracingService> = Effect.fnUntraced(function* (data) {
    const tracing = yield* TracingService;
    tracing.write(
      Obj.make(Message.Message, {
        parentMessage: tracing.getTraceContext().parentMessage,
        ...data,
        properties: {
          [MESSAGE_PROPERTY_TOOL_CALL_ID]: tracing.getTraceContext().toolCallId,
          ...data.properties,
        },
      }),
      tracing.getTraceContext(),
    );
  });
}

export namespace TracingService {
  export interface TraceContext {
    currentInvocation?: InvocationTraceData;

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

  /**
   * Trace data for a function/trigger invocation.
   */
  export interface InvocationTraceData {
    invocationId: ObjectId;
    invocationTraceQueue?: DXN.String;
  }

  /**
   * Payload for a function/trigger invocation.
   */
  export interface FunctionInvocationPayload {
    data?: any;
    inputNodeId?: string;
    trigger?: {
      id: string;
      kind: Trigger.Kind;
    };
  }
}

/**
 * Goes into {@link Message['properties']}
 */
export const MESSAGE_PROPERTY_TOOL_CALL_ID = 'toolCallId' as const;
