//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { groupOf, hiddenKinds } from './kinds.ts';

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
