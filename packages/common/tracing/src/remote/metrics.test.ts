//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type MetricData, type MetricObserver, RemoteMetrics } from './metrics.ts';

type Recorded = { name: string; value?: number | string; data?: MetricData };

/** Records what a processor was asked to do — the fan-out under test is observable from this side. */
class RecordingProcessor {
  readonly increments: Recorded[] = [];
  readonly observations: { name: string; callback: MetricObserver }[] = [];
  readonly detached: string[] = [];

  increment(name: string, value?: number, data?: MetricData): void {
    this.increments.push({ name, value, data });
  }

  distribution(): void {}
  set(): void {}
  gauge(): void {}

  observe(name: string, callback: MetricObserver, _data?: MetricData) {
    this.observations.push({ name, callback });
    return () => {
      this.detached.push(name);
    };
  }
}

describe('RemoteMetrics', () => {
  test('drops everything when no processor is registered', () => {
    const metrics = new RemoteMetrics();

    // The no-collector case: SDK code calls these unconditionally, so they must be inert.
    metrics.increment('dxos.test.counter');
    const cleanup = metrics.observe('dxos.test.gauge', () => 1);
    cleanup();
  });

  test('fans out to every registered processor', () => {
    const metrics = new RemoteMetrics();
    const first = new RecordingProcessor();
    const second = new RecordingProcessor();
    metrics.registerProcessor(first);
    metrics.registerProcessor(second);

    metrics.increment('dxos.test.counter', 2, { unit: '{thing}' });

    expect(first.increments).toEqual([{ name: 'dxos.test.counter', value: 2, data: { unit: '{thing}' } }]);
    expect(second.increments).toEqual(first.increments);
  });

  test('replays observations registered before the processor attached', () => {
    const metrics = new RemoteMetrics();
    const callback = () => 7;

    // SDK code registers its gauges at startup, long before the collector is configured.
    metrics.observe('dxos.test.gauge', callback);

    const processor = new RecordingProcessor();
    metrics.registerProcessor(processor);

    expect(processor.observations).toEqual([{ name: 'dxos.test.gauge', callback }]);
    expect(processor.observations[0].callback()).toEqual(7);
  });

  test('registering the same processor twice does not double-report', () => {
    const metrics = new RemoteMetrics();
    const processor = new RecordingProcessor();

    metrics.observe('dxos.test.gauge', () => 1);
    metrics.registerProcessor(processor);
    metrics.registerProcessor(processor);
    metrics.increment('dxos.test.counter');

    expect(processor.observations).toHaveLength(1);
    expect(processor.increments).toHaveLength(1);
  });

  test('cleanup detaches from every processor, including ones attached later', () => {
    const metrics = new RemoteMetrics();
    const early = new RecordingProcessor();
    metrics.registerProcessor(early);

    const cleanup = metrics.observe('dxos.test.gauge', () => 1);

    const late = new RecordingProcessor();
    metrics.registerProcessor(late);
    expect(late.observations).toHaveLength(1);

    cleanup();

    expect(early.detached).toEqual(['dxos.test.gauge']);
    expect(late.detached).toEqual(['dxos.test.gauge']);
  });

  test('unregistering detaches the processor and its observations', () => {
    const metrics = new RemoteMetrics();
    const processor = new RecordingProcessor();
    metrics.registerProcessor(processor);
    metrics.observe('dxos.test.gauge', () => 1);

    metrics.unregisterProcessor(processor);

    expect(processor.detached).toEqual(['dxos.test.gauge']);
    metrics.increment('dxos.test.counter');
    expect(processor.increments).toEqual([]);
  });

  test('unregistering an unknown processor is a no-op', () => {
    const metrics = new RemoteMetrics();
    const processor = new RecordingProcessor();

    // Idempotent: a collector whose close path runs twice must not double-detach.
    metrics.unregisterProcessor(processor);
    metrics.registerProcessor(processor);
    metrics.unregisterProcessor(processor);
    metrics.unregisterProcessor(processor);

    expect(processor.detached).toEqual([]);
  });

  test('only the live processor is used after close and re-initialize', () => {
    const metrics = new RemoteMetrics();
    const closed = new RecordingProcessor();
    metrics.registerProcessor(closed);
    const cleanup = metrics.observe('dxos.test.gauge', () => 1);

    // A collector shutdown followed by a fresh one — the dead processor must not be
    // re-attached to, and must not double-report alongside its replacement.
    metrics.unregisterProcessor(closed);
    const live = new RecordingProcessor();
    metrics.registerProcessor(live);

    metrics.increment('dxos.test.counter');
    metrics.observe('dxos.test.other', () => 2);

    expect(closed.increments).toEqual([]);
    expect(closed.observations.map(({ name }) => name)).toEqual(['dxos.test.gauge']);
    expect(live.increments).toHaveLength(1);
    expect(live.observations.map(({ name }) => name)).toEqual(['dxos.test.gauge', 'dxos.test.other']);

    // The pre-close registration's cleanup still resolves against the live processor only.
    cleanup();
    expect(live.detached).toEqual(['dxos.test.gauge']);
    expect(closed.detached).toEqual(['dxos.test.gauge']);
  });

  test('a cleaned-up observation is not replayed to a new processor', () => {
    const metrics = new RemoteMetrics();
    const cleanup = metrics.observe('dxos.test.gauge', () => 1);
    cleanup();

    const processor = new RecordingProcessor();
    metrics.registerProcessor(processor);

    expect(processor.observations).toEqual([]);
  });
});
