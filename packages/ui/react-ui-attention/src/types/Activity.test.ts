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

  test('an agent at work takes the mark from presence', ({ expect }) => {
    expect(Activity.resolve(['viewers', 'typing', 'agent'])).toMatchObject({ mark: 'agent', moving: 'mark' });
  });

  test('only the first animated slot in motion order moves', ({ expect }) => {
    expect(Activity.resolve(['typing', 'working']).moving).toBe('mark');
    expect(Activity.resolve(['typing', 'working', 'asked']).moving).toBe('corner');
    expect(Activity.resolve(['busy', 'viewers-working']).moving).toBe('mark');
    expect(Activity.resolve(['busy']).moving).toBe('fill');
  });

  test('a still slot passes motion to the next', ({ expect }) => {
    // A mention is still, so motion falls through the corner to the agent star.
    expect(Activity.resolve(['mention', 'agent'])).toMatchObject({ corner: 'mention', moving: 'mark' });
    // The attended fill outranks busy and is still, so nothing moves.
    expect(Activity.resolve(['attended', 'busy']).moving).toBeUndefined();
  });
});
