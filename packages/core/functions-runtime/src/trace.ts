//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { QueueService, TracingService, Trigger } from '@dxos/functions';
import { DXN, ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ErrorCodec, FunctionRuntimeKind, SerializedError } from '@dxos/protocols';
import { Effect, type Context } from 'effect';
import { Message } from '@dxos/types';
import { ConsolePrinter } from '@dxos/ai';

export enum InvocationOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

// TODO(burdon): Convert to extensible discriminated union of EDGE events.
export enum InvocationTraceEventType {
  START = 'start',
  END = 'end',
}

/**
 * @deprecated Relace with EncodedError.
 */
export const TraceEventException = Schema.Struct({
  timestamp: Schema.Number,
  message: Schema.String,
  name: Schema.String,
  stack: Schema.optional(Schema.String),
});
export type TraceEventException = Schema.Schema.Type<typeof TraceEventException>;

export const InvocationTraceStartEvent = Schema.Struct({
  /**
   * Queue message id.
   */
  id: ObjectId,
  type: Schema.Literal(InvocationTraceEventType.START),
  /**
   * Invocation id, the same for invocation start and end events.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  timestamp: Schema.Number,
  /**
   * Data passed to function / workflow as an argument.
   */
  // TODO(burdon): Input schema?
  input: Schema.Object,
  /**
   * Queue  for function/workflow invocation events.
   */
  invocationTraceQueue: Schema.optional(Type.Ref(Queue)),
  /**
   * DXN of the invoked function/workflow.
   */
  invocationTarget: Schema.optional(Type.Ref(Obj.Any)),
  /**
   * Present for automatic invocations.
   */
  trigger: Schema.optional(Type.Ref(Trigger.Trigger)),
  /**
   * Runtime executing the function.
   */
  runtime: Schema.optional(FunctionRuntimeKind),
}).pipe(Type.Obj({ typename: 'dxos.org/type/InvocationTraceStart', version: '0.1.0' }));

export type InvocationTraceStartEvent = Schema.Schema.Type<typeof InvocationTraceStartEvent>;

export const InvocationTraceEndEvent = Schema.Struct({
  /**
   * Trace event id.
   */
  id: ObjectId,
  type: Schema.Literal(InvocationTraceEventType.END),
  /**
   * Invocation id, will be the same for invocation start and end.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  // TODO(burdon): Remove ms suffix.
  timestamp: Schema.Number,

  outcome: Schema.Enums(InvocationOutcome),

  error: Schema.optional(SerializedError),
}).pipe(Type.Obj({ typename: 'dxos.org/type/InvocationTraceEnd', version: '0.1.0' }));

export type InvocationTraceEndEvent = Schema.Schema.Type<typeof InvocationTraceEndEvent>;

export type InvocationTraceEvent = InvocationTraceStartEvent | InvocationTraceEndEvent;

export const TraceEventLog = Schema.Struct({
  timestamp: Schema.Number,
  level: Schema.String,
  message: Schema.String,
  context: Schema.optional(Schema.Object),
});

export const TraceEvent = Schema.Struct({
  id: ObjectId,
  // TODO(burdon): Need enum/numeric result (not string).
  outcome: Schema.String,
  truncated: Schema.Boolean,
  /** Time when the event was persisted. */
  ingestionTimestamp: Schema.Number,
  logs: Schema.Array(TraceEventLog),
  exceptions: Schema.Array(TraceEventException),
}).pipe(Type.Obj({ typename: 'dxos.org/type/TraceEvent', version: '0.1.0' }));

export type TraceEvent = Schema.Schema.Type<typeof TraceEvent>;

/**
 * InvocationTrace event format.
 * This is the combined format of InvocationTraceStartEvent and InvocationTraceEndEvents for UI consumption.
 */
export type InvocationSpan = {
  id: string;
  timestamp: number;
  duration: number;
  outcome: InvocationOutcome;
  input: object;
  invocationTraceQueue?: Ref.Ref<Queue>;
  invocationTarget?: Ref.Ref<Obj.Any>;
  trigger?: Ref.Ref<Trigger.Trigger>;
  error?: SerializedError;
  runtime?: FunctionRuntimeKind;
};

export const createInvocationSpans = (items?: InvocationTraceEvent[]): InvocationSpan[] => {
  if (!items) {
    return [];
  }

  const eventsByInvocationId = new Map<string, { start?: InvocationTraceStartEvent; end?: InvocationTraceEndEvent }>();
  for (const event of items) {
    if (!('invocationId' in event)) {
      // Skip legacy format entries.
      continue;
    }

    const invocationId = event.invocationId;
    const entry = eventsByInvocationId.get(invocationId) || { start: undefined, end: undefined };
    if (event.type === InvocationTraceEventType.START) {
      entry.start = event as InvocationTraceStartEvent;
    } else if (event.type === InvocationTraceEventType.END) {
      entry.end = event as InvocationTraceEndEvent;
    }

    eventsByInvocationId.set(invocationId, entry);
  }

  const now = Date.now();
  const result: InvocationSpan[] = [];

  // Create spans for each invocation
  for (const [invocationId, { start, end }] of eventsByInvocationId.entries()) {
    if (!start) {
      // No start event, can't create a meaningful span
      log.warn('found end event without matching start', { invocationId });
      continue;
    }
    const isInProgress = end === undefined;

    result.push({
      id: invocationId,
      timestamp: start.timestamp,
      duration: isInProgress ? now - start.timestamp : end!.timestamp - start.timestamp,
      outcome: end?.outcome ?? InvocationOutcome.PENDING,
      error: end?.error,
      input: start.input,
      invocationTraceQueue: start.invocationTraceQueue,
      invocationTarget: start.invocationTarget,
      trigger: start.trigger,
      runtime: start.runtime,
    });
  }

  return result;
};

/**
 * Extension of TracingService with runtime-specific helpers.
 */
export namespace TracingServiceExt {
  /**
   * Creates a TracingService layer that writes events to a single specific queue.
   * Assumes we are working with a single invocation.
   */
  export const layerQueue = (queue: Queue): Layer.Layer<TracingService> =>
    Layer.succeed(TracingService, {
      getTraceContext: () => ({}),
      write: (event: Obj.Any) => {
        void queue.append([event]).catch((error) => {
          log.warn('Failed to write trace event to queue', { error });
        });
      },
      traceInvocationStart: () => Effect.die('TracingService.traceInvocationStart is not supported in this context.'),
      traceInvocationEnd: () => Effect.die('TracingService.traceInvocationEnd is not supported in this context.'),
    });

  /**
   * Creates a TracingService layer that logs events using the logger.
   */
  export const layerLogInfo = (): Layer.Layer<TracingService> =>
    Layer.succeed(TracingService, {
      getTraceContext: () => ({}),
      write: (event: Obj.Any, context: TracingService.TraceContext) => {
        log.info('trace event', { event });
      },
      traceInvocationStart: ({ payload, target }) =>
        Effect.sync(() => {
          const invocationId = ObjectId.random();
          log.info('trace invocation start', { invocationId, payload });
          return { invocationId, invocationTraceQueue: undefined };
        }),
      traceInvocationEnd: ({ trace, exception }) =>
        Effect.sync(() => {
          log.info('trace invocation end', { trace, exception });
        }),
    });

  /**
   * Creates a TracingService layer that maintains a global queue of invocation events with subqueues for each invocation.
   */
  export const layerInvocationsQueue = (opts: { invocationTraceQueue: Queue }) =>
    Layer.effect(
      TracingService,
      Effect.gen(function* () {
        const queueService = yield* QueueService;
        return {
          getTraceContext: () => ({}),
          write: (event: Obj.Any, traceContext: TracingService.TraceContext) => {
            const specificQueueDXN = traceContext.currentInvocation?.invocationTraceQueue;
            const queue = specificQueueDXN
              ? queueService.queues.get(DXN.parse(specificQueueDXN))
              : opts.invocationTraceQueue;
            void queue.append([event]).catch((error) => {
              log.warn('Failed to write trace event to queue', { error });
            });
          },
          traceInvocationStart: Effect.fn('traceInvocationStart')(
            function* ({ payload, target }) {
              const invocationId = ObjectId.random();
              const invocationTraceQueue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
              const now = Date.now();
              const traceEvent = Obj.make(InvocationTraceStartEvent, {
                type: InvocationTraceEventType.START,
                invocationId,
                timestamp: now,
                // TODO(dmaretskyi): Not json-stringifying this makes ECHO fail when one ECHO object becomes embedded in another ECHO object.
                input: JSON.parse(JSON.stringify(payload.data ?? {})),
                invocationTraceQueue: Ref.fromDXN(invocationTraceQueue.dxn),
                invocationTarget: target ? Ref.fromDXN(target) : undefined,
                trigger: payload.trigger ? Ref.fromDXN(DXN.fromLocalObjectId(payload.trigger.id)) : undefined,
              });
              yield* QueueService.append(opts.invocationTraceQueue, [traceEvent]);

              return { invocationId, invocationTraceQueue: invocationTraceQueue.dxn.toString() };
            },
            Effect.provideService(QueueService, queueService),
          ),
          traceInvocationEnd: Effect.fn('traceInvocationEnd')(
            function* ({ trace, exception }) {
              const now = Date.now();
              const traceEvent = Obj.make(InvocationTraceEndEvent, {
                type: InvocationTraceEventType.END,
                invocationId: trace.invocationId,
                timestamp: now,
                outcome: exception ? InvocationOutcome.FAILURE : InvocationOutcome.SUCCESS,
                error: exception ? ErrorCodec.encode(exception) : undefined,
              });
              yield* QueueService.append(opts.invocationTraceQueue, [traceEvent]);
            },
            Effect.provideService(QueueService, queueService),
          ),
        };
      }),
    );

  export const layerInvocationsQueueTest = Layer.unwrapEffect(
    Effect.gen(function* () {
      const queue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
      return layerInvocationsQueue({ invocationTraceQueue: queue });
    }),
  );

  export const layerConsolePrettyPrint = () => Layer.succeed(TracingService, new PrettyConsoleTracer());
}

class PrettyConsoleTracer implements Context.Tag.Service<TracingService> {
  getTraceContext(): TracingService.TraceContext {
    return {};
  }

  write(event: Obj.Any, traceContext: TracingService.TraceContext): void {
    if (Obj.instanceOf(Message.Message, event)) {
      new ConsolePrinter({ tag: traceContext.currentInvocation?.invocationId }).printMessage(event as Message.Message);
    } else {
      console.log('[EVENT]', JSON.stringify(traceContext), JSON.stringify(event, null, 2));
    }
  }

  traceInvocationStart = Effect.fn('traceInvocationStart')(function* ({ payload, target }) {
    const now = Date.now();
    const invocationId = ObjectId.random();

    const triggerType = payload.trigger ? payload.trigger.kind : undefined;

    // eslint-disable-next-line no-console
    console.log(
      `⚡️ ${triggerType ? `Trigger: ${triggerType}` : ''} ${target ? Ref.fromDXN(target) : undefined}\n`,
      JSON.stringify(payload.data, null, 2),
    );
    return { invocationId, invocationTraceQueue: undefined };
  });

  traceInvocationEnd = Effect.fn('traceInvocationEnd')(function* ({ trace, exception }) {
    const outcome = exception ? InvocationOutcome.FAILURE : InvocationOutcome.SUCCESS;
    // eslint-disable-next-line no-console
    console.log(`${exception ? '❌' : '✅'} ${trace.invocationId} ${outcome}\n`);
    if (exception) {
      console.error(exception);
    }
  });
}
