//
// Copyright 2026 DXOS.org
//

import { ROOT_CONTEXT, context, trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { StackContextManager } from '@opentelemetry/sdk-trace-web';
import { afterEach, describe, test } from 'vitest';

import { LogEntry, LogLevel } from '@dxos/log';

import { OtelLogs, stringifyValues } from './logs.ts';

describe('stringifyValues', () => {
  test('serializes errors via stack', ({ expect }) => {
    const error = new Error('upload exploded');
    const result = stringifyValues({ error }, 'ctx_');
    expect(result.ctx_error).toContain('upload exploded');
  });

  test('falls back to name and message when stack is absent', ({ expect }) => {
    const error = new Error('no stack here');
    error.stack = undefined;
    expect(stringifyValues({ error })).toEqual({ error: 'Error: no stack here' });
  });

  test('serializes errors nested past the flatten depth', ({ expect }) => {
    const result = stringifyValues({ outer: { inner: { error: new Error('deep') } } });
    expect(Object.values(result).join()).toContain('deep');
  });

  test('flattens plain objects and stringifies arrays', ({ expect }) => {
    expect(stringifyValues({ status: 502, nested: { count: 1 }, list: [1, 2] })).toEqual({
      status: '502',
      nested_count: '1',
      list: '[1,2]',
    });
  });

  test('skips undefined values and handles a missing object', ({ expect }) => {
    expect(stringifyValues({ present: 'yes', absent: undefined })).toEqual({ present: 'yes' });
    expect(stringifyValues(undefined)).toEqual({});
  });
});

describe('OtelLogs', () => {
  afterEach(() => context.disable());

  test('flags the trace of a warning emitted inside a span, not of an info line', async ({ expect }) => {
    context.setGlobalContextManager(new StackContextManager().enable());
    const flagged: string[] = [];
    const logs = new OtelLogs({
      destinations: [{ endpoint: 'http://localhost:1', headers: {} }],
      resource: resourceFromAttributes({}),
      getTags: () => ({}),
      logLevel: LogLevel.ERROR,
      exporter: new InMemoryLogRecordExporter(),
      onTraceFlagged: (traceId) => flagged.push(traceId),
    });
    const spanContext = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: 1 };

    context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), () => {
      logs.logProcessor(undefined as never, new LogEntry({ level: LogLevel.INFO, message: 'fine' }));
      logs.logProcessor(undefined as never, new LogEntry({ level: LogLevel.WARN, message: 'odd' }));
    });
    logs.logProcessor(undefined as never, new LogEntry({ level: LogLevel.WARN, message: 'untraced' }));

    expect(flagged).toEqual([spanContext.traceId]);
    await logs.close();
  });

  test('links a record to the span active when it was emitted', async ({ expect }) => {
    context.setGlobalContextManager(new StackContextManager().enable());
    const exporter = new InMemoryLogRecordExporter();
    const logs = new OtelLogs({
      destinations: [{ endpoint: 'http://localhost:1', headers: {} }],
      resource: resourceFromAttributes({}),
      getTags: () => ({}),
      logLevel: LogLevel.INFO,
      exporter,
    });
    const spanContext = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: 1 };

    context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), () => {
      logs.logProcessor(undefined as never, new LogEntry({ level: LogLevel.INFO, message: 'inside' }));
    });
    logs.logProcessor(undefined as never, new LogEntry({ level: LogLevel.INFO, message: 'outside' }));
    await logs.flush();

    const [inside, outside] = exporter.getFinishedLogRecords();
    expect(inside.spanContext?.traceId).toBe(spanContext.traceId);
    expect(inside.spanContext?.spanId).toBe(spanContext.spanId);
    expect(outside.spanContext).toBeUndefined();
    await logs.close();
  });
});
