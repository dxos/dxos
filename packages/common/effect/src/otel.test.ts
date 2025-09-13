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

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'test',
  }),
});

beforeAll(() => {
  sdk.start();
});

afterAll(() => {
  sdk.shutdown();
});

beforeEach((ctx) => {
  const span = trace.getTracer('testing-framework').startSpan(ctx.task.name);
  ctx.onTestFailed((ctx) => {
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
