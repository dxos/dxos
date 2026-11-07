//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { groupOf, hiddenKinds, kindStyle, styleOf } from './kinds.ts';

describe('kind groups', () => {
  test('sorts kinds into concepts, requirements and QA', ({ expect }) => {
    expect(['type', 'op', 'component', 'code', 'spec', 'something-new'].map(groupOf)).toEqual(
      Array(6).fill('concepts'),
    );
    expect(['feat', 'req'].map(groupOf)).toEqual(['requirements', 'requirements']);
    expect(['scenario', 'test', 'suite'].map(groupOf)).toEqual(['qa', 'qa', 'qa']);
  });

  test('hides the kinds of each group that is off, independently', ({ expect }) => {
    const kinds = ['type', 'feat', 'test', 'op', 'scenario'];
    expect(hiddenKinds(kinds, { concepts: true, requirements: true, qa: false })).toEqual(['test', 'scenario']);
    expect(hiddenKinds(kinds, { concepts: false, requirements: true, qa: true })).toEqual(['type', 'op']);
    expect(hiddenKinds(kinds, { concepts: true, requirements: false, qa: true })).toEqual(['feat']);
  });
});

describe('kind styles', () => {
  test("draws a kind with its dialect's icon and hue, and an unknown hue as neutral", ({ expect }) => {
    expect([kindStyle('feat'), kindStyle('scene')]).toEqual([
      { icon: 'ph--star--regular', hue: 'emerald' },
      { icon: 'ph--film-slate--regular', hue: 'emerald' },
    ]);
    expect(styleOf({ links: {}, icon: 'ph--cube--regular', hue: 'plaid' })).toEqual({
      icon: 'ph--cube--regular',
      hue: 'neutral',
    });
  });
});
