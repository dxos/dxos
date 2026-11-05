//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Activity from './Activity.ts';

const viewer: Activity.Treatment = { slot: 'mark', icon: 'dot', hue: 'primary', priority: 10 };
const agent: Activity.Treatment = { slot: 'mark', icon: 'star', priority: 30, animate: true };
const unread: Activity.Treatment = { slot: 'mark', icon: 'star', hue: 'amber', priority: 20 };
const busy: Activity.Treatment = { slot: 'fill', hue: 'amber', priority: 10, animate: true };
const working: Activity.Treatment = { slot: 'edge', hue: 'amber', priority: 10 };
const failed: Activity.Treatment = { slot: 'edge', hue: 'error', priority: 40 };
const asked: Activity.Treatment = { slot: 'corner', hue: 'amber', priority: 40, animate: true };
const mention: Activity.Treatment = { slot: 'corner', hue: 'rose', priority: 30 };

describe('Activity.resolve', () => {
  test('nothing requested draws nothing', ({ expect }) => {
    expect(Activity.resolve([])).toEqual({});
  });

  test('each slot keeps only its highest-priority treatment', ({ expect }) => {
    expect(Activity.resolve([busy, viewer, agent, working, failed, mention, asked])).toEqual({
      fill: busy,
      mark: agent,
      edge: failed,
      corner: asked,
      moving: 'corner',
    });
  });

  test('a tie goes to the first requested', ({ expect }) => {
    const other: Activity.Treatment = { ...viewer, hue: 'violet' };
    expect(Activity.resolve([viewer, other]).mark).toBe(viewer);
    expect(Activity.resolve([other, viewer]).mark).toBe(other);
  });

  test('attention holds the fill, so a fill treatment neither draws nor moves', ({ expect }) => {
    expect(Activity.resolve([busy], { attention: true })).toEqual({ moving: undefined });
  });

  test('only the first animated slot in motion order moves', ({ expect }) => {
    expect(Activity.resolve([busy, agent]).moving).toBe('mark');
    expect(Activity.resolve([busy, agent, asked]).moving).toBe('corner');
    expect(Activity.resolve([busy]).moving).toBe('fill');
  });

  test('a still winner passes motion to the next slot', ({ expect }) => {
    expect(Activity.resolve([mention, agent])).toMatchObject({ corner: mention, moving: 'mark' });
    expect(Activity.resolve([unread, busy])).toMatchObject({ mark: unread, moving: 'fill' });
  });
});
