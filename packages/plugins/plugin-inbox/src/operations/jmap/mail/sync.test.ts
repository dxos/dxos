//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, vi } from 'vitest';

import { Obj } from '@dxos/echo';

import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { InboxResolver, JmapCredentials } from '../../../services';
import { mapEmail } from './mapper';
import { streamJmapEmailIds } from './sync';

const HOST = 'api.fastmail.com';
const ACCOUNT_ID = 'u9999';
const API_URL = 'https://api.fastmail.com/jmap/api/';

const SESSION = {
  apiUrl: API_URL,
  username: 'alice@fastmail.com',
  primaryAccounts: { 'urn:ietf:params:jmap:mail': ACCOUNT_ID },
};

const TestLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  JmapCredentials.fromValues({ host: HOST, token: 'test-token' }),
  InboxResolver.Mock(),
);

let originalFetch: typeof globalThis.fetch;
let emailQueryIds: string[];
let emailQueryPositions: number[];

beforeEach(() => {
  emailQueryIds = ['e1', 'e2', 'e3'];
  emailQueryPositions = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const request = input instanceof Request ? input : new Request(input, init);
    const body = request.method === 'POST' ? JSON.parse(await request.text()) : undefined;
    const result = request.method === 'POST' ? respondToPost(body) : SESSION;
    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('JMAP sync read path', () => {
  it.effect(
    'reads inbox ids, dedups against existing ones, fetches + maps the new emails',
    Effect.fnUntraced(function* ({ expect }) {
      const session = yield* Jmap.getSession;
      const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
      if (!accountId) {
        throw new Error('expected a mail account');
      }
      const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };

      const { list: folders } = yield* JmapMail.mailboxGet(target);
      const inbox = folders.find((folder) => folder.role === 'inbox');
      if (!inbox) {
        throw new Error('expected an inbox folder');
      }
      expect(inbox.id).toBe('mb-inbox');

      const { ids } = yield* JmapMail.emailQuery(target, {
        filter: { inMailbox: inbox.id },
        sort: [{ property: 'receivedAt', isAscending: false }],
        limit: 50,
      });
      expect(ids).toEqual(['e1', 'e2', 'e3']);

      // Dedup against ids already present in the feed (e1) — mirrors `existingIds` in the handler.
      const existingIds = new Set(['e1']);
      const newIds = ids.filter((id) => !existingIds.has(id));
      expect(newIds).toEqual(['e2', 'e3']);

      const { list: emails } = yield* JmapMail.emailGet(target, newIds);
      const mapped = (yield* Effect.forEach(emails, (email) => mapEmail(email))).filter(Predicate.isNotNullable);
      expect(mapped).toHaveLength(2);

      const first = mapped[0];
      expect(Obj.getMeta(first.message).keys.find((key) => key.source === JMAP_MESSAGE_SOURCE)?.id).toBe('e2');
      expect(first.message.properties?.subject).toBe('Subject e2');
      // The inbox folder id is propagated so the handler applies the corresponding folder tag.
      expect(first.mailboxIds).toContain('mb-inbox');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'continues querying JMAP ids past the old scan window',
    Effect.fnUntraced(function* ({ expect }) {
      emailQueryIds = Array.from({ length: 550 }, (_, i) => `e${i + 1}`);

      const ids = yield* streamJmapEmailIds({ apiUrl: API_URL, accountId: ACCOUNT_ID }, { inMailbox: 'mb-inbox' }).pipe(
        Stream.runCollect,
        Effect.map(Chunk.toArray),
      );

      expect(ids).toHaveLength(550);
      expect(ids[0]).toBe('e1');
      expect(ids.at(-1)).toBe('e550');
      expect(emailQueryPositions).toEqual([0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]);
    }, Effect.provide(TestLayer)),
  );
});

const makeEmail = (id: string) => ({
  id,
  threadId: `t-${id}`,
  mailboxIds: { 'mb-inbox': true },
  from: [{ name: 'Alice', email: 'alice@x.com' }],
  to: [{ email: 'bob@x.com' }],
  subject: `Subject ${id}`,
  receivedAt: '2026-01-15T10:00:00.000Z',
  preview: `preview ${id}`,
  bodyValues: { body: { value: `body ${id}` } },
  textBody: [{ partId: 'body' }],
});

const respondToPost = (body: any): unknown => {
  const [name, args] = body.methodCalls[0];
  switch (name) {
    case 'Mailbox/get':
      return {
        methodResponses: [
          ['Mailbox/get', { accountId: ACCOUNT_ID, list: [{ id: 'mb-inbox', name: 'Inbox', role: 'inbox' }] }, '0'],
        ],
      };
    case 'Email/query': {
      const position = args.position ?? 0;
      const limit = args.limit ?? emailQueryIds.length;
      emailQueryPositions.push(position);
      return {
        methodResponses: [
          [
            'Email/query',
            {
              accountId: ACCOUNT_ID,
              ids: emailQueryIds.slice(position, position + limit),
              total: emailQueryIds.length,
            },
            '0',
          ],
        ],
      };
    }
    case 'Email/get':
      return { methodResponses: [['Email/get', { accountId: ACCOUNT_ID, list: args.ids.map(makeEmail) }, '0']] };
    default:
      return { methodResponses: [['error', { type: 'unknownMethod' }, '0']] };
  }
};
