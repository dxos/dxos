//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { groupOf, hiddenKinds } from './kinds.ts';

describe('kind groups', () => {
  test('sorts kinds into concepts, requirements, QA and other', ({ expect }) => {
    expect(['type', 'op', 'component', 'binding', 'code', 'spec'].map(groupOf)).toEqual(Array(6).fill('concepts'));
    expect(['feat', 'req', 'question'].map(groupOf)).toEqual(Array(3).fill('requirements'));
    expect(['scenario', 'test', 'suite'].map(groupOf)).toEqual(['qa', 'qa', 'qa']);
    expect(['something-new', 'note'].map(groupOf)).toEqual(['other', 'other']);
  });

  test('hides the kinds of each group that is off, independently', ({ expect }) => {
    const all = { concepts: true, requirements: true, qa: true, other: true };
    const kinds = ['type', 'feat', 'test', 'op', 'scenario', 'question', 'something-new'];
    expect(hiddenKinds(kinds, { ...all, qa: false })).toEqual(['test', 'scenario']);
    expect(hiddenKinds(kinds, { ...all, concepts: false })).toEqual(['type', 'op']);
    expect(hiddenKinds(kinds, { ...all, requirements: false })).toEqual(['feat', 'question']);
    expect(hiddenKinds(kinds, { ...all, other: false })).toEqual(['something-new']);
  });
});
