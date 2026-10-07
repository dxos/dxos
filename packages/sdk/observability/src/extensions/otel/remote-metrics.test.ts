//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import { TRACE_PROCESSOR } from '@dxos/tracing';

import type * as OtelMetricsSink from './OtelMetricsSink.ts';
import { METRIC_BATCH_INTERVAL, RemoteMetricsForwarder, type RemoteMetricsForwarderOptions } from './remote-metrics.ts';

describe('RemoteMetricsForwarder', () => {
  let forwarder: RemoteMetricsForwarder | undefined;
  const posted: (OtelMetricsSink.Init | OtelMetricsSink.Batch)[] = [];

  afterEach(async () => {
    await forwarder?.close();
    forwarder = undefined;
    posted.length = 0;
    vi.useRealTimers();
  });

  const makeForwarder = (options?: RemoteMetricsForwarderOptions) => {
    forwarder = new RemoteMetricsForwarder((message) => posted.push(message), options);
    return forwarder;
  };

  test('posts nothing until flushed', () => {
    const forwarder = makeForwarder();
    forwarder.increment('test.count');
    expect(posted).toEqual([]);

    forwarder.flush();
    expect(posted).toEqual([
      { type: 'otel-metric-batch', metrics: [{ op: 'increment', name: 'test.count', values: [1], tags: undefined }] },
    ]);
  });

  test('aggregates each series into one batch', () => {
    const forwarder = makeForwarder();
    forwarder.increment('test.count');
    forwarder.increment('test.count', 2);
    forwarder.increment('test.count', 1, { kind: 'b' });
    forwarder.gauge('test.lag', 7, { kind: 'a' }, { unit: 'ms' });
    forwarder.gauge('test.lag', 9, { kind: 'a' }, { unit: 'ms' });
    forwarder.distribution('test.duration', 0.5);
    forwarder.distribution('test.duration', 1.5);
    forwarder.flush();

    expect(posted).toEqual([
      {
        type: 'otel-metric-batch',
        metrics: [
          { op: 'increment', name: 'test.count', values: [3], tags: undefined },
          { op: 'increment', name: 'test.count', values: [1], tags: { kind: 'b' } },
          { op: 'gauge', name: 'test.lag', values: [9], tags: { kind: 'a' }, meta: { unit: 'ms' } },
          { op: 'distribution', name: 'test.duration', values: [0.5, 1.5], tags: undefined },
        ],
      },
    ]);
  });

  test('flushes once per interval regardless of call count', () => {
    vi.useFakeTimers();
    makeForwarder();
    for (let index = 0; index < 1_000; index++) {
      TRACE_PROCESSOR.remoteMetrics.distribution('test.bytes', index, { unit: 'bytes' });
    }
    expect(posted).toEqual([]);

    vi.advanceTimersByTime(METRIC_BATCH_INTERVAL);
    expect(posted).toHaveLength(1);
    const [batch] = posted;
    expect(batch.type === 'otel-metric-batch' && batch.metrics[0].values).toHaveLength(1_000);

    TRACE_PROCESSOR.remoteMetrics.increment('test.later');
    vi.advanceTimersByTime(METRIC_BATCH_INTERVAL);
    expect(posted).toHaveLength(2);
  });

  test('posts early once the value cap is reached', () => {
    const forwarder = makeForwarder({ maxValues: 3 });
    forwarder.distribution('test.duration', 1);
    forwarder.distribution('test.duration', 2);
    expect(posted).toEqual([]);

    forwarder.distribution('test.duration', 3);
    expect(posted).toEqual([
      {
        type: 'otel-metric-batch',
        metrics: [{ op: 'distribution', name: 'test.duration', values: [1, 2, 3], tags: undefined }],
      },
    ]);
  });

  test('receives calls published through TRACE_PROCESSOR and drops nullish tags', () => {
    const forwarder = makeForwarder();
    TRACE_PROCESSOR.remoteMetrics.increment('test.rpc', 2, { tags: { route: 'sync', skip: undefined } });
    forwarder.flush();

    expect(posted).toEqual([
      {
        type: 'otel-metric-batch',
        metrics: [{ op: 'increment', name: 'test.rpc', values: [2], tags: { route: 'sync' } }],
      },
    ]);
  });

  test('close posts what is pending and unregisters from TRACE_PROCESSOR', async () => {
    const forwarder = makeForwarder();
    forwarder.increment('test.before-close');
    await forwarder.close();
    TRACE_PROCESSOR.remoteMetrics.increment('test.after-close');

    expect(posted).toEqual([
      {
        type: 'otel-metric-batch',
        metrics: [{ op: 'increment', name: 'test.before-close', values: [1], tags: undefined }],
      },
    ]);
  });
});
