//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test } from 'vitest';

import { TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelMetricRecord, type OtelMetricsSinkInit } from './metrics-sink';
import { RemoteMetricsForwarder } from './remote-metrics';

describe('RemoteMetricsForwarder', () => {
  let forwarder: RemoteMetricsForwarder | undefined;
  const posted: (OtelMetricsSinkInit | OtelMetricRecord)[] = [];

  afterEach(async () => {
    await forwarder?.close();
    forwarder = undefined;
    posted.length = 0;
  });

  const makeForwarder = () => {
    forwarder = new RemoteMetricsForwarder((message) => posted.push(message));
    return forwarder;
  };

  test('forwards instrument calls as records', () => {
    const forwarder = makeForwarder();
    forwarder.increment('test.count');
    forwarder.gauge('test.lag', 7, { kind: 'a' }, { unit: 'ms' });
    forwarder.distribution('test.duration', 0.5);

    expect(posted).toEqual([
      { type: 'otel-metric', op: 'increment', name: 'test.count', value: 1, tags: undefined },
      { type: 'otel-metric', op: 'gauge', name: 'test.lag', value: 7, tags: { kind: 'a' }, meta: { unit: 'ms' } },
      { type: 'otel-metric', op: 'distribution', name: 'test.duration', value: 0.5, tags: undefined },
    ]);
  });

  test('receives calls published through TRACE_PROCESSOR and drops nullish tags', () => {
    makeForwarder();
    TRACE_PROCESSOR.remoteMetrics.increment('test.rpc', 2, { tags: { route: 'sync', skip: undefined } });

    expect(posted).toEqual([{ type: 'otel-metric', op: 'increment', name: 'test.rpc', value: 2, tags: { route: 'sync' } }]);
  });

  test('close unregisters from TRACE_PROCESSOR', async () => {
    const forwarder = makeForwarder();
    await forwarder.close();
    TRACE_PROCESSOR.remoteMetrics.increment('test.after-close');

    expect(posted).toEqual([]);
  });
});
