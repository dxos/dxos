//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { type Logger, SeverityNumber, logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ConsoleLogRecordExporter, LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import {
  ATTR_CODE_FILE_PATH,
  ATTR_CODE_LINE_NUMBER,
  ATTR_CODE_STACKTRACE,
  ATTR_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { beforeEach } from 'vitest';

import { LogLevel, type LogProcessor, log } from '@dxos/log';

import { layerOtel } from './otel';

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

Test.beforeAll(() => {
  sdk.start();
});

Test.afterAll(async () => {
  await loggerProvider.shutdown();
  await sdk.shutdown();
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

Test.it.live(
  'Test Suite One',
  Effect.fnUntraced(
    function* () {
      yield* baz();
    },
    Effect.provide(layerOtel(Effect.succeed({}))),
  ),
);
