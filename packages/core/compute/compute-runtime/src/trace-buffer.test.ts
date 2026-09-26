//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { CIRCULAR, detachData } from './trace-buffer.ts';

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
      input: { anchor: { id: 'anchor', fiber: { owner: CIRCULAR } } },
    });
  });

  test('writes a value shared by siblings out in full', ({ expect }) => {
    const shared = { value: 1 };
    expect(detachData({ first: shared, second: shared })).toEqual({ first: { value: 1 }, second: { value: 1 } });
  });

  test('writes a bigint as its digits', ({ expect }) => {
    expect(detachData({ size: 10n })).toEqual({ size: '10' });
  });
});
