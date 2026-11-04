//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Activity from './Activity.ts';

describe('Activity.resolve', () => {
  test('nothing requested draws nothing', ({ expect }) => {
    expect(Activity.resolve([])).toEqual({});
  });

  test('each slot keeps only its highest-precedence treatment', ({ expect }) => {
    expect(
      Activity.resolve(['busy', 'attended', 'viewer', 'viewers', 'working', 'failed', 'read-only', 'mention']),
    ).toEqual({ fill: 'attended', mark: 'viewers', edge: 'failed', corner: 'mention', moving: undefined });
  });

  test('only the first animated slot in motion order moves', ({ expect }) => {
    expect(Activity.resolve(['typing', 'working']).moving).toBe('edge');
    expect(Activity.resolve(['typing', 'working', 'asked']).moving).toBe('corner');
    expect(Activity.resolve(['busy', 'viewers-working']).moving).toBe('mark');
    expect(Activity.resolve(['busy']).moving).toBe('fill');
  });

  test('a still winner keeps a lower slot moving', ({ expect }) => {
    // The failed edge outranks the working runner and is still, so motion falls through to the typing mark.
    expect(Activity.resolve(['failed', 'working', 'typing'])).toMatchObject({ edge: 'failed', moving: 'mark' });
  });
});
