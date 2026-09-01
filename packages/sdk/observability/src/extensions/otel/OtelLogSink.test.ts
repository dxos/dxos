//
// Copyright 2026 DXOS.org
//

import { SeverityNumber } from '@opentelemetry/api-logs';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import { InMemoryLogRecordExporter, type ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { afterEach, describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { LogEntry, LogLevel, serializeToJsonl } from '@dxos/log';

import * as OtelLogSink from './OtelLogSink';

describe('OtelLogSink', () => {
  const defaultInit: OtelLogSink.Init = {
    type: 'otel-init',
    destinations: [{ endpoint: 'http://localhost:1', headers: {} }],
    resourceAttributes: { 'service.name': 'test-service', 'session.id': 'session-1' },
    logLevel: LogLevel.INFO,
    tags: { team: 'blue' },
  };

  let sink: OtelLogSink.Sink | undefined;

  afterEach(async () => {
    await sink?.close();
    sink = undefined;
  });

  const makeSink = (init: Partial<OtelLogSink.Init> = {}) => {
    const exporter = new InMemoryLogRecordExporter();
    sink = new OtelLogSink.Sink({ ...defaultInit, ...init }, { exporter });
    const records = async (): Promise<ReadableLogRecord[]> => {
      invariant(sink);
      await sink.flush();
      return exporter.getFinishedLogRecords();
    };
    return { sink, records };
  };

  test('exports a line with severity, body, timestamp, tags, and resource attributes', async () => {
    const { sink, records } = makeSink();
    const timestamp = Date.UTC(2026, 0, 2, 3, 4, 5);
    sink.append(makeLine({ level: LogLevel.WARN, message: 'sync stalled', timestamp }));

    const [record] = await records();
    expect(record.severityNumber).toBe(SeverityNumber.WARN);
    expect(record.body).toBe('sync stalled');
    expect(hrTimeToMilliseconds(record.hrTime)).toBe(timestamp);
    expect(record.attributes.team).toBe('blue');
    expect(record.resource.attributes['service.name']).toBe('test-service');
    expect(record.resource.attributes['session.id']).toBe('session-1');
  });

  test('drops lines below the export level', async () => {
    const { sink, records } = makeSink();
    sink.append(makeLine({ level: LogLevel.DEBUG, message: 'chatty' }));
    sink.append(makeLine({ level: LogLevel.INFO, message: 'kept' }));

    const exported = await records();
    expect(exported.map((record) => record.body)).toEqual(['kept']);
  });

  test('prefixes context keys with ctx_ and carries the error stack', async () => {
    const { sink, records } = makeSink();
    const error = new Error('boom');
    sink.append(
      makeLine({ level: LogLevel.ERROR, message: 'failed', context: { spaceId: 'space-1', attempt: 2 }, error }),
    );

    const [record] = await records();
    expect(record.attributes.ctx_spaceId).toBe('space-1');
    expect(record.attributes.ctx_attempt).toBe('2');
    expect(String(record.attributes.error)).toContain('boom');
  });

  test('otel-tags updates the tags on later records', async () => {
    const { sink, records } = makeSink();
    sink.append(makeLine({ level: LogLevel.INFO, message: 'before' }));
    sink.handleMessage({ type: 'otel-tags', tags: { identity: 'alice' } });
    sink.append(makeLine({ level: LogLevel.INFO, message: 'after' }));

    const [before, after] = await records();
    expect(before.attributes.identity).toBeUndefined();
    expect(after.attributes.identity).toBe('alice');
    expect(after.attributes.team).toBe('blue');
  });

  test('ignores malformed lines and unknown level letters', async () => {
    const { sink, records } = makeSink();
    sink.append('not json');
    sink.append('null');
    sink.append(JSON.stringify({ t: new Date().toISOString(), l: '?', m: 'unknown level' }));
    sink.append(makeLine({ level: LogLevel.INFO, message: 'valid' }));

    const exported = await records();
    expect(exported.map((record) => record.body)).toEqual(['valid']);
  });
});

/** Serialize a real {@link LogEntry} the way the producing realm's log processor does. */
const makeLine = (init: ConstructorParameters<typeof LogEntry>[0]): string => {
  const line = serializeToJsonl(new LogEntry(init), { env: 'test-env' });
  invariant(line !== undefined);
  return line;
};
