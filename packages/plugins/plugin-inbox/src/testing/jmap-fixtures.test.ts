//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { type JmapMail } from '../apis';
import { JmapMailApi } from '../services';

import { generateJmapDataset } from './jmap-fixtures';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';
const INBOX_ID = 'mb-inbox';

describe('generateJmapDataset + JmapMailApi.mock', () => {
  test('generates a coherent, ascending-by-date dataset', ({ expect }) => {
    const { session, folders, emails } = generateJmapDataset({ count: 30, seed: 1 });
    expect(session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY]).toBeTruthy();
    expect(folders.some((folder) => folder.role === 'inbox')).toBe(true);
    expect(emails).toHaveLength(30);
    // Every email has the sender + body the mapper reads.
    for (const email of emails) {
      expect(email.from?.[0]?.email).toMatch(/@/);
      expect(email.subject).toBeTruthy();
      const partId = email.textBody?.[0]?.partId;
      expect(partId && email.bodyValues?.[partId]?.value).toBeTruthy();
    }
    // Ascending by receivedAt (the mock's window filter + sort rely on it).
    const dates = emails.map((email) => new Date(email.receivedAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  test('is deterministic for a fixed seed', ({ expect }) => {
    // Pin the window too: with the default window anchored to `new Date()`, two calls a moment apart
    // would produce different receivedAt values.
    const window = { start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-02-01T00:00:00Z') };
    const first = generateJmapDataset({ count: 10, seed: 7, ...window });
    const second = generateJmapDataset({ count: 10, seed: 7, ...window });
    expect(second.emails).toEqual(first.emails);
  });

  test('mock service discovers the session, folders, and paginates emails', async ({ expect }) => {
    const dataset = generateJmapDataset({ count: 25, seed: 3 });
    const accountId = dataset.session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    const target: JmapMail.Target = { apiUrl: dataset.session.apiUrl, accountId };

    const program = Effect.gen(function* () {
      const api = yield* JmapMailApi;

      const session = yield* api.getSession;
      expect(session.apiUrl).toBe(dataset.session.apiUrl);

      const { list: folders } = yield* api.mailboxGet(target);
      expect(folders).toEqual(dataset.folders);

      // Sorted newest-first; first page.
      const sort = [{ property: 'receivedAt', isAscending: false }];
      const page1 = yield* api.emailQuery(target, { sort, position: 0, limit: 10 });
      expect(page1.ids).toHaveLength(10);
      expect(page1.total).toBe(25);

      // Walk the rest via position.
      const page2 = yield* api.emailQuery(target, { sort, position: 10, limit: 10 });
      const page3 = yield* api.emailQuery(target, { sort, position: 20, limit: 10 });
      expect(page2.ids).toHaveLength(10);
      expect(page3.ids).toHaveLength(5);

      // No overlap; newest id first.
      const all = [...page1.ids, ...page2.ids, ...page3.ids];
      expect(new Set(all).size).toBe(25);

      // emailGet resolves full bodies.
      const { list } = yield* api.emailGet(target, [page1.ids[0]]);
      expect(list[0]?.id).toBe(page1.ids[0]);
      const partId = list[0]?.textBody?.[0]?.partId;
      expect(partId && list[0]?.bodyValues?.[partId]?.value).toBeTruthy();
    });

    await EffectEx.runPromise(program.pipe(Effect.provide(JmapMailApi.mock(dataset))));
  });

  test('mock service honours the after/before window and folder scope', async ({ expect }) => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-31T00:00:00Z');
    const dataset = generateJmapDataset({ count: 30, seed: 5, start, end });
    const accountId = dataset.session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    const target: JmapMail.Target = { apiUrl: dataset.session.apiUrl, accountId };

    const program = Effect.gen(function* () {
      const api = yield* JmapMailApi;
      // A window covering only the back half of the dataset, scoped to the inbox.
      const { total } = yield* api.emailQuery(target, {
        filter: { operator: 'AND', conditions: [{ after: '2026-01-16T00:00:00Z' }, { inMailbox: INBOX_ID }] },
      });
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(30);

      // A folder with no emails yields nothing.
      const empty = yield* api.emailQuery(target, { filter: { inMailbox: 'mb-sent' } });
      expect(empty.total).toBe(0);
    });

    await EffectEx.runPromise(program.pipe(Effect.provide(JmapMailApi.mock(dataset))));
  });
});
