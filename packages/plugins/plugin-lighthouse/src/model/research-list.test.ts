//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Session } from '../client/types.ts';
import { newestFirst } from '../paths.ts';
import { toResearchRow } from './research-list.ts';

const session = (patch: Partial<Session>): Session => ({
  run: 'r1',
  goal: 'Board game cafés in Bangkok',
  status: 'reported',
  busy: false,
  budget: {},
  spent: { seconds: 300, usd: 0.21, pages: 17 },
  startedAt: '2026-10-29T10:00:00Z',
  ...patch,
});

describe('research list', () => {
  test('reads a Research and its session as a row', ({ expect }) => {
    expect(toResearchRow({ id: 'a', name: 'Cafés', goal: 'Board game cafés', run: 'r1' }, session({}))).toEqual({
      id: 'a',
      name: 'Cafés',
      goal: 'Board game cafés',
      state: 'reported',
      pages: 17,
      usd: 0.21,
      startedAt: '2026-10-29T10:00:00Z',
    });
    expect(toResearchRow({ id: 'b', goal: '' }, undefined).state).toBe('new');
    expect(toResearchRow({ id: 'c', goal: 'x', run: 'r2' }, undefined).state).toBe('unknown');
    expect(toResearchRow({ id: 'd', goal: 'x', run: 'r1' }, session({ busy: true, status: 'idle' })).state).toBe(
      'running',
    );
    expect(
      toResearchRow({ id: 'e', goal: 'Flats in Warsaw\nmore', run: 'r1' }, session({ status: 'failed' })),
    ).toMatchObject({
      name: 'Flats in Warsaw',
      state: 'failed',
    });
  });

  test('orders newest first by object id', ({ expect }) => {
    const ids = ['01HZA', '01HZC', '01HZB'].map((id) => ({ id }));
    expect([...ids].sort(newestFirst).map(({ id }) => id)).toEqual(['01HZC', '01HZB', '01HZA']);
  });
});
