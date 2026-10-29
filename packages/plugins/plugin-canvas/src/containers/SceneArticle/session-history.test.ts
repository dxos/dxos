//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { makeCanvas } from '#model';

import { sessionHistory } from './session-history.ts';

const MOVE = { before: 'a', after: 'b', paths: [] };

describe('sessionHistory', () => {
  test("a canvas's history outlives the article: reopening finds the same steps", () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const first = sessionHistory(canvas);
    first.done.push(MOVE);
    expect(sessionHistory(canvas).done).toEqual([MOVE]);
  });

  test('each canvas has a history of its own', () => {
    const { canvas: one } = makeCanvas({ dimension: '3d' });
    const { canvas: two } = makeCanvas({ dimension: '3d' });
    sessionHistory(one).done.push(MOVE);
    expect(sessionHistory(two).done).toEqual([]);
  });
});
