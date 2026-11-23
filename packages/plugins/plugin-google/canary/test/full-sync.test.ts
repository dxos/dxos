//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { FullSync } from '../full-sync.ts';

describe('FullSync.expected', () => {
  test('lists the window with the sync scope, two days inside the horizon', async ({ expect }) => {
    const queries: string[] = [];
    const mailbox = { listIds: (query: string) => Effect.sync(() => (queries.push(query), ['m2', 'm1'])) };
    const credentials = { clientId: 'id', clientSecret: 'secret', refreshToken: 'token' };
    const expected = await EffectEx.runPromise(
      new FullSync(mailbox, credentials).expected(730, new Date('2026-11-03T12:00:00Z')),
    );
    expect(queries).toEqual(['in:anywhere -in:spam -in:trash -in:drafts -in:chats after:2024/11/5']);
    expect(expected).toEqual([{ gmailId: 'm2' }, { gmailId: 'm1' }]);
  });
});
