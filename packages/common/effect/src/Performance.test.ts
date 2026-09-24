//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as EffectEx from './EffectEx.ts';
import * as Performance from './Performance.ts';

describe('Performance', () => {
  test('summarizeDetail bounds blobs, long strings, large arrays and depth', () => {
    const long = 'x'.repeat(1_000);
    const summary = Performance.summarizeDetail({
      blob: new Uint8Array(4096),
      buffer: new ArrayBuffer(16),
      long,
      many: Array.from({ length: 100 }, (_, i) => i),
      nested: { a: { b: { c: { d: 1 } } } },
      short: 'ok',
    }) as Record<string, unknown>;

    expect(summary.blob).toBe('<Uint8Array 4096 bytes>');
    expect(summary.buffer).toBe('<ArrayBuffer 16 bytes>');
    expect(summary.long).toMatch(/^x{256}…\(1000 chars\)$/);
    expect(summary.many).toBe('<Array 100 items>');
    expect(summary.nested).toEqual({ a: { b: '<Object 1 keys>' } });
    expect(summary.short).toBe('ok');
  });

  test('trackEntry stores a bounded detail on the timeline', () => {
    // Vitest runs under Vite, so the gate reads DEV and the entry lands.
    expect(Performance.TRACK_ENTRIES_ENABLED).toBe(true);
    const name = `perf-test-${Math.random()}`;
    Performance.trackEntry({
      name,
      start: performance.now(),
      detail: { params: [new Uint8Array(10)] },
      devtools: {
        dataType: 'track-entry',
        track: 't',
        trackGroup: 'g',
        color: 'primary',
        properties: [['sql', 'y'.repeat(300)]],
      },
    });
    const [entry] = performance.getEntriesByName(name, 'measure') as PerformanceMeasure[];
    expect(entry.detail.params).toEqual(['<Uint8Array 10 bytes>']);
    expect(entry.detail.devtools.properties[0][1]).toHaveLength(256 + '…(300 chars)'.length);
    performance.clearMeasures(name);
  });

  test('addTrackEntry records the span once the effect settles', async () => {
    const name = `perf-effect-${Math.random()}`;
    const result = await EffectEx.runPromise(
      Effect.succeed(42).pipe(Performance.addTrackEntry((exit) => ({ name, detail: { exit: exit._tag } }))),
    );
    expect(result).toBe(42);
    const [entry] = performance.getEntriesByName(name, 'measure') as PerformanceMeasure[];
    expect(entry.detail.exit).toBe('Success');
    performance.clearMeasures(name);
  });
});
