//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { FullSync, type FullSyncMailbox } from '../full-sync.ts';

const credentials = { clientId: 'id', clientSecret: 'secret', refreshToken: 'token' };

describe('FullSync.expected', () => {
  test('lists the window with the sync scope and samples the newest messages for content', async ({ expect }) => {
    const queries: string[] = [];
    const mailbox: FullSyncMailbox = {
      listIds: (query) => Effect.sync(() => (queries.push(query), ['m3', 'm2', 'm1'])),
      getHeaders: (id) =>
        Effect.succeed({ internalDate: 0, headers: { Subject: `subject ${id}`, From: `Sender <${id}@enron.com>` } }),
    };
    const expected = await EffectEx.runPromise(
      new FullSync(mailbox, credentials).expected(730, 2, new Date('2026-11-03T12:00:00Z')),
    );
    expect(queries).toEqual(['in:anywhere -in:spam -in:trash -in:drafts -in:chats after:2024/11/5']);
    expect(expected).toEqual([
      { gmailId: 'm3', subject: 'subject m3', sender: 'm3@enron.com' },
      { gmailId: 'm2', subject: 'subject m2', sender: 'm2@enron.com' },
      { gmailId: 'm1' },
    ]);
  });
});
