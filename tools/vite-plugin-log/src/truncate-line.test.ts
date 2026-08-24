//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MAX_LINE_LENGTH, truncateLine } from './truncate-line.ts';

const entry = (context: string) =>
  JSON.stringify({
    t: '2026-08-24T10:12:38.996Z',
    l: 'D',
    m: 'setLocalCollectionState',
    f: 'packages/core/echo/echo-host/src/automerge/collection-synchronizer.ts',
    n: 84,
    i: 'dedicated-worker:dxos-client-worker:4fr534',
    c: context,
  });

describe('truncateLine', () => {
  test('keeps the line parseable and preserves metadata', ({ expect }) => {
    // Regression: a blind `slice` cut mid-string, so every over-long line became unparseable
    // JSON with no marker — indistinguishable from an absent log to any query tool.
    const line = entry(
      JSON.stringify({
        documents: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`doc${i}`, 'a'.repeat(64)])),
      }),
    );
    expect(line.length).toBeGreaterThan(MAX_LINE_LENGTH);

    const truncated = truncateLine(line);
    expect(truncated.length).toBeLessThanOrEqual(MAX_LINE_LENGTH);

    const parsed = JSON.parse(truncated);
    expect(parsed.m).toEqual('setLocalCollectionState');
    expect(parsed.i).toEqual('dedicated-worker:dxos-client-worker:4fr534');
    expect(parsed.n).toEqual(84);

    const context = JSON.parse(parsed.c);
    expect(context.truncated).toEqual(true);
    expect(context.originalLength).toBeGreaterThan(MAX_LINE_LENGTH);
  });

  test('holds the cap even when metadata alone overflows', ({ expect }) => {
    // Dropping the context is not always enough: a pathological `m` can exceed the cap on its
    // own, and the cap has to be a guarantee for the flush-size reasoning above it to hold.
    const line = JSON.stringify({
      t: '2026-08-24T10:12:38.996Z',
      l: 'D',
      m: 'x'.repeat(MAX_LINE_LENGTH),
      c: 'y'.repeat(MAX_LINE_LENGTH),
    });
    const truncated = truncateLine(line);

    expect(truncated.length).toBeLessThanOrEqual(MAX_LINE_LENGTH);
    const parsed = JSON.parse(truncated);
    expect(parsed.t).toEqual('2026-08-24T10:12:38.996Z');
    expect(JSON.parse(parsed.c).truncated).toEqual(true);
  });
});
