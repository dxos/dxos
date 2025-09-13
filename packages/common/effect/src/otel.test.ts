import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Effect, Duration } from 'effect';
import { it, beforeAll, afterAll } from '@effect/vitest';
import { TestContext } from 'vitest';
import { layerOtel } from './otel';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_CODE_FILE_PATH,
  ATTR_CODE_LINE_NUMBER,
  ATTR_CODE_STACKTRACE,
} from '@opentelemetry/semantic-conventions';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { afterEach, beforeEach } from 'vitest';

import { logs, SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { LoggerProvider, SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { log, LogLevel, type LogProcessor } from '@dxos/log';

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

const makeOtelLogProcessor = (logger: Logger): LogProcessor => {
  return (config, entry) => {
    let severity: SeverityNumber = SeverityNumber.UNSPECIFIED;
    switch (entry.level) {
      case LogLevel.DEBUG:
        severity = SeverityNumber.DEBUG;
        break;
      case LogLevel.INFO:
        severity = SeverityNumber.INFO;
        break;
      case LogLevel.WARN:
        severity = SeverityNumber.WARN;
        break;
      case LogLevel.ERROR:
        severity = SeverityNumber.ERROR;
        break;
    }

    logger.emit({
      body: entry.error ? ('stack' in entry.error ? entry.error.stack : String(entry.error)) : entry.message,
      severityNumber: severity,
      attributes: {
        [ATTR_CODE_FILE_PATH]: entry.meta?.F,
        [ATTR_CODE_LINE_NUMBER]: entry.meta?.L,
        [ATTR_CODE_STACKTRACE]: entry.error?.stack,
        ...(typeof entry.context === 'object'
          ? entry.context
          : {
              ctx: entry.context,
            }),
      },
    });
  };
};
log.addProcessor(makeOtelLogProcessor(logger));

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

  log('log inside foo', { detail: 123 });
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
