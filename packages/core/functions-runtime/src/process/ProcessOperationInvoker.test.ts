//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';

import { TracingService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import { ProcessManagerImpl } from './process-manager-impl';
import * as ServiceResolver from './ServiceResolver';

class DatabaseService extends Context.Tag('@test/DatabaseService')<
  DatabaseService,
  {
    query(sql: string): Effect.Effect<readonly string[]>;
    execute(sql: string): Effect.Effect<void>;
  }
>() {}

const makeInMemoryDatabase = () => {
  const rows: string[] = [];
  return {
    service: {
      query: (sql: string) => Effect.sync(() => rows.filter((row) => row.includes(sql))),
      execute: (sql: string) =>
        Effect.sync(() => {
          rows.push(sql);
        }),
    } satisfies Context.Tag.Service<DatabaseService>,
    rows,
  };
};

const Double = Operation.make({
  meta: { key: 'test/double', name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const DoubleHandler = Operation.withHandler(
  Double,
  Effect.fn(function* ({ value }) {
    return value * 2;
  }),
);

const Echo = Operation.make({
  meta: { key: 'test/echo', name: 'Echo' },
  input: Schema.String,
  output: Schema.String,
});

const EchoHandler = Operation.withHandler(
  Echo,
  Effect.fn(function* (input) {
    return `echo: ${input}`;
  }),
);

const InsertRow = Operation.make({
  meta: { key: 'test/insert-row', name: 'InsertRow' },
  input: Schema.String,
  output: Schema.String,
  services: [DatabaseService],
});

const InsertRowHandler = Operation.withHandler(
  InsertRow,
  Effect.fn(function* (input) {
    const db = yield* DatabaseService;
    yield* db.execute(input);
    return `inserted: ${input}`;
  }),
);

const makeKvStore = () => {
  const store = new Map<string, string>();
  const kvStore = KeyValueStore.make({
    get: (key: string) => Effect.succeed(Option.fromNullable(store.get(key))),
    getUint8Array: (key: string) =>
      Effect.succeed(Option.map(Option.fromNullable(store.get(key)), (value) => new TextEncoder().encode(value))),
    set: (key: string, value: string | Uint8Array) =>
      Effect.sync(() => {
        store.set(key, typeof value === 'string' ? value : new TextDecoder().decode(value));
      }),
    remove: (key: string) =>
      Effect.sync(() => {
        store.delete(key);
      }),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size),
  });
  return { store, kvStore };
};

const makeInvoker = (opts?: {
  serviceResolver?: ServiceResolver.ServiceResolver;
  extraHandlers?: Operation.WithHandler<Operation.Definition.Any>[];
  tracingService?: Context.Tag.Service<TracingService>;
}) => {
  const { kvStore } = makeKvStore();
  const registry = Registry.make();
  const handlerSet = OperationHandlerSet.make(
    DoubleHandler,
    EchoHandler,
    InsertRowHandler,
    ...(opts?.extraHandlers ?? []),
  );
  const manager = new ProcessManagerImpl({
    registry,
    kvStore,
    serviceResolver: opts?.serviceResolver,
    tracingService: opts?.tracingService,
    handlerSet,
  });
  const invoker = ProcessOperationInvoker.make({ manager, handlerSet });
  return { manager, invoker };
};

describe('ProcessOperationInvoker', () => {
  it.effect(
    'invokes a simple operation',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();
      const result = yield* invoker.invoke(Double, { value: 21 });
      expect(result).toEqual(42);
    }),
  );

  it.effect(
    'invokes a string operation',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();
      const result = yield* invoker.invoke(Echo, 'hello');
      expect(result).toEqual('echo: hello');
    }),
  );

  it.scoped(
    'publishes invocation events',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();

      const queue = yield* PubSub.subscribe(invoker.invocations);
      yield* invoker.invoke(Double, { value: 5 });
      const event = yield* Queue.take(queue);
      expect(event.operation.meta.key).toEqual('test/double');
      expect(event.input).toEqual({ value: 5 });
      expect(event.output).toEqual(10);
      expect(event.timestamp).toBeGreaterThan(0);
    }),
  );

  it.effect(
    'invokes operation with external services via resolver',
    Effect.fn(function* ({ expect }) {
      const { service: dbService, rows } = makeInMemoryDatabase();
      const resolver = ServiceResolver.fromContext(Context.make(DatabaseService, dbService));
      const { invoker } = makeInvoker({ serviceResolver: resolver });

      const result = yield* invoker.invoke(InsertRow, 'test-row');
      expect(result).toEqual('inserted: test-row');
      expect(rows).toEqual(['test-row']);
    }),
  );

  it.effect(
    'fails when required service is not available',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();
      const result = yield* invoker.invoke(InsertRow, 'test-row').pipe(Effect.flip);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('@test/DatabaseService');
    }),
  );

  it.effect(
    'schedules a followup and tracks pending count',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();
      yield* invoker.schedule(Double, { value: 7 });
      yield* invoker.awaitFollowups;
      const pending = yield* invoker.pendingFollowups;
      expect(pending).toEqual(0);
    }),
  );

  it.effect(
    'handles multiple sequential invocations',
    Effect.fn(function* ({ expect }) {
      const { invoker } = makeInvoker();

      const result1 = yield* invoker.invoke(Double, { value: 1 });
      const result2 = yield* invoker.invoke(Double, { value: 2 });
      const result3 = yield* invoker.invoke(Echo, 'world');

      expect(result1).toEqual(2);
      expect(result2).toEqual(4);
      expect(result3).toEqual('echo: world');
    }),
  );

  describe('tracing', () => {
    it.effect(
      'calls traceInvocationStart for root processes',
      Effect.fn(function* ({ expect }) {
        const invocationStarts: TracingService.FunctionInvocationPayload[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* ({ payload }) {
            invocationStarts.push(payload);
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
          traceInvocationEnd: () => Effect.void,
        };

        const { invoker } = makeInvoker({ tracingService });
        yield* invoker.invoke(Double, { value: 5 });

        expect(invocationStarts).toHaveLength(1);
        expect(invocationStarts[0].data).toBeDefined();
      }),
    );

    it.effect(
      'provides TracingService to process functions with trace context',
      Effect.fn(function* ({ expect }) {
        const capturedContexts: TracingService.TraceContext[] = [];

        const TracingCapture = Operation.make({
          meta: { key: 'test/tracing-capture', name: 'TracingCapture' },
          input: Schema.Void,
          output: Schema.String,
          services: [TracingService],
        });

        const TracingCaptureHandler = Operation.withHandler(
          TracingCapture,
          Effect.fn(function* () {
            const tracing = yield* TracingService;
            capturedContexts.push(tracing.getTraceContext());
            return 'captured';
          }),
        );

        const messageId = ObjectId.random();
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const { kvStore } = makeKvStore();
        const registry = Registry.make();
        const handlerSet = OperationHandlerSet.make(TracingCaptureHandler);
        const manager = new ProcessManagerImpl({
          registry,
          kvStore,
          tracingService,
          handlerSet,
        });

        const invoker = ProcessOperationInvoker.make({ manager, handlerSet });
        yield* invoker.invoke(TracingCapture, undefined, { tracing: { message: messageId, toolCallId: 'tc-1' } } as any);

        expect(capturedContexts).toHaveLength(1);
        expect(capturedContexts[0].parentMessage).toEqual(messageId);
        expect(capturedContexts[0].toolCallId).toEqual('tc-1');
      }),
    );
  });
});
