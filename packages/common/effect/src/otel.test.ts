import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Effect, Duration } from 'effect';
import { it, beforeAll, afterAll } from '@effect/vitest';
import { TestContext } from 'vitest';
import { layerOtel } from './otel';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { afterEach, beforeEach } from 'vitest';

import { logs } from '@opentelemetry/api-logs';
import { LoggerProvider, SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'test',
});

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  resource,
});

// and add a processor to export log record
const loggerProvider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
  resource,
});
logs.setGlobalLoggerProvider(loggerProvider);

// You can also use global singleton
const logger = logs.getLogger('test');

beforeAll(() => {
  sdk.start();
});

afterAll(() => {
  loggerProvider.shutdown();
  sdk.shutdown();
});

beforeEach((ctx) => {
  const span = trace.getTracer('testing-framework').startSpan(ctx.task.name);
  ctx.onTestFailed((ctx) => {
    // TODO(dmaretskyi): Record result.
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  });
  ctx.onTestFinished((ctx) => {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
});

const foo = Effect.fn('foo')(function* () {
  yield* Effect.sleep(Duration.millis(100));

  logger.emit({
    body: 'log inside foo',
  });
});

const bar = Effect.fn('bar')(function* () {
  yield* foo();
});

const baz = Effect.fn('baz')(function* () {
  yield* bar();
});

it.live(
  'Test Suite One',
  Effect.fnUntraced(
    function* () {
      yield* baz();
    },
    Effect.provide(layerOtel(Effect.succeed({}))),
  ),
);
