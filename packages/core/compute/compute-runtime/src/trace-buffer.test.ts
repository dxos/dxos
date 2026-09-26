//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MAX_DEPTH, MAX_NODES, SEEN, TRUNCATED, UNSERIALIZABLE, detachData } from './trace-buffer.ts';

describe('detachData', () => {
  test('copies plain data', ({ expect }) => {
    const data = { key: 'op', input: { list: [1, { nested: true }] } };
    const detached = detachData(data);
    expect(detached).toEqual(data);
    expect(detached).not.toBe(data);
  });

  test('writes a reference back to an ancestor as a marker rather than returning the live graph', ({ expect }) => {
    // The shape a DOM anchor with framework expandos has: a property pointing back up the graph.
    const anchor: Record<string, unknown> = { id: 'anchor' };
    anchor.fiber = { owner: anchor };
    const data = { key: 'popover', input: { anchor } };

    expect(detachData(data)).toEqual({
      key: 'popover',
      input: { anchor: { id: 'anchor', fiber: { owner: SEEN } } },
    });
  });

  test('writes a value shared by siblings once', ({ expect }) => {
    const shared = { value: 1 };
    expect(detachData({ first: shared, second: shared })).toEqual({ first: { value: 1 }, second: SEEN });
  });

  test('writes a bigint as its digits', ({ expect }) => {
    expect(detachData({ size: 10n })).toEqual({ size: '10' });
  });

  test('truncates nesting past the depth budget', ({ expect }) => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let level = 0; level < MAX_DEPTH + 4; level++) {
      deep = { child: deep };
    }
    const serialized = JSON.stringify(detachData(deep));
    expect(serialized).toContain(TRUNCATED);
    expect(serialized).not.toContain('leaf');
  });

  test('stays linear on a densely shared graph', ({ expect }) => {
    // Each layer references the whole previous layer twice: a plain JSON copy would write 2^layers leaves.
    let layer: Record<string, unknown> = { leaf: 1 };
    for (let level = 0; level < 40; level++) {
      layer = { left: layer, right: layer };
    }
    const started = performance.now();
    const serialized = JSON.stringify(detachData(layer));
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(serialized.length).toBeLessThan(10_000);
  });

  test('truncates past the node budget', ({ expect }) => {
    const wide = { items: Array.from({ length: MAX_NODES + 50 }, (_, index) => ({ index })) };
    const detached = detachData(wide);
    expect(JSON.stringify(detached)).toContain(TRUNCATED);
  });

  test('keeps the event when a value serializes to nothing or throws', ({ expect }) => {
    expect(detachData({ toJSON: () => undefined })).toBeNull();
    expect(
      detachData({
        toJSON: () => {
          throw new Error('boom');
        },
      }),
    ).toBe(UNSERIALIZABLE);
  });
});
