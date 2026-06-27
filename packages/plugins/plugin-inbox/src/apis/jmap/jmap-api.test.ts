//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, vi } from 'vitest';

import { JmapApiError } from '../../errors';
import { JmapCredentials } from '../../services';
import { Jmap, JmapMail } from './index';

const HOST = 'api.fastmail.com';
const ACCOUNT_ID = 'u9999';
const API_URL = 'https://api.fastmail.com/jmap/api/';

const SESSION = {
  apiUrl: API_URL,
  username: 'alice@fastmail.com',
  primaryAccounts: {
    'urn:ietf:params:jmap:mail': ACCOUNT_ID,
    'urn:ietf:params:jmap:submission': ACCOUNT_ID,
  },
  accounts: { [ACCOUNT_ID]: { name: 'alice@fastmail.com', isPersonal: true } },
  capabilities: { 'urn:ietf:params:jmap:core': {}, 'urn:ietf:params:jmap:mail': {} },
  state: 'cyrus-0',
};

const TARGET: JmapMail.Target = { apiUrl: API_URL, accountId: ACCOUNT_ID };

const TestLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  JmapCredentials.fromValues({ host: HOST, token: 'test-token' }),
);

type MockRequest = { url: string; method: string; body: any };
type MockResult = { status?: number; body: unknown };

let respond: (request: MockRequest) => MockResult;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const request = input instanceof Request ? input : new Request(input, init);
    const text = request.method === 'POST' ? await request.text() : '';
    const result = respond({ url: request.url, method: request.method, body: text ? JSON.parse(text) : undefined });
    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('JMAP API', () => {
  it.effect(
    'getSession discovers the well-known URL and returns apiUrl + account',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ url, method }) => {
        expect(method).toBe('GET');
        expect(url).toContain('/.well-known/jmap');
        return { body: SESSION };
      };
      const session = yield* Jmap.getSession;
      expect(session.apiUrl).toBe(API_URL);
      expect(session.primaryAccounts['urn:ietf:params:jmap:mail']).toBe(ACCOUNT_ID);
      expect(session.username).toBe('alice@fastmail.com');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'mailboxGet returns folders with roles',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        expect(body.methodCalls[0][0]).toBe('Mailbox/get');
        return {
          body: {
            methodResponses: [
              [
                'Mailbox/get',
                {
                  accountId: ACCOUNT_ID,
                  list: [
                    { id: 'mb-inbox', name: 'Inbox', role: 'inbox' },
                    { id: 'mb-sent', name: 'Sent', role: 'sent' },
                  ],
                },
                '0',
              ],
            ],
          },
        };
      };
      const result = yield* JmapMail.mailboxGet(TARGET);
      expect(result.list).toHaveLength(2);
      expect(result.list.find((folder) => folder.role === 'inbox')?.id).toBe('mb-inbox');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'emailQuery sends the filter + sort and returns ids',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        const [name, args] = body.methodCalls[0];
        expect(name).toBe('Email/query');
        expect(args.accountId).toBe(ACCOUNT_ID);
        expect(args.filter).toEqual({ inMailbox: 'mb-inbox' });
        expect(args.sort).toEqual([{ property: 'receivedAt', isAscending: false }]);
        expect(args.limit).toBe(50);
        return {
          body: { methodResponses: [['Email/query', { accountId: ACCOUNT_ID, ids: ['e1', 'e2'], total: 2 }, '0']] },
        };
      };
      const result = yield* JmapMail.emailQuery(TARGET, {
        filter: { inMailbox: 'mb-inbox' },
        sort: [{ property: 'receivedAt', isAscending: false }],
        limit: 50,
      });
      expect(result.ids).toEqual(['e1', 'e2']);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'emailGet requests text body values and decodes emails',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        const [name, args] = body.methodCalls[0];
        expect(name).toBe('Email/get');
        expect(args.ids).toEqual(['e1']);
        expect(args.fetchTextBodyValues).toBe(true);
        return {
          body: {
            methodResponses: [
              [
                'Email/get',
                {
                  accountId: ACCOUNT_ID,
                  list: [
                    {
                      id: 'e1',
                      receivedAt: '2026-01-01T00:00:00.000Z',
                      from: [{ name: 'A', email: 'a@b.com' }],
                      bodyValues: { body: { value: 'hi' } },
                      textBody: [{ partId: 'body' }],
                    },
                  ],
                },
                '0',
              ],
            ],
          },
        };
      };
      const result = yield* JmapMail.emailGet(TARGET, ['e1']);
      expect(result.list[0].id).toBe('e1');
      expect(result.list[0].bodyValues?.body?.value).toBe('hi');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'submitEmail creates the draft and submission in a single batched request',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        expect(body.using).toContain('urn:ietf:params:jmap:submission');
        const [setName, setArgs, setId] = body.methodCalls[0];
        const [subName, subArgs, subId] = body.methodCalls[1];
        expect(setName).toBe('Email/set');
        expect(setArgs.create.draft.mailboxIds).toEqual({ 'mb-drafts': true });
        expect(setArgs.create.draft.keywords).toEqual({ $draft: true, $seen: true });
        expect(subName).toBe('EmailSubmission/set');
        expect(subArgs.create.sub.emailId).toBe('#draft');
        expect(subArgs.onSuccessUpdateEmail['#sub']['mailboxIds/mb-sent']).toBe(true);
        expect(subArgs.onSuccessUpdateEmail['#sub']['mailboxIds/mb-drafts']).toBeNull();
        return {
          body: {
            methodResponses: [
              [setName, { accountId: ACCOUNT_ID, created: { draft: { id: 'new-1', threadId: 't-1' } } }, setId],
              [subName, { accountId: ACCOUNT_ID, created: { sub: { id: 'sub-1' } } }, subId],
            ],
          },
        };
      };
      const result = yield* JmapMail.submitEmail(TARGET, {
        identityId: 'id-1',
        draftsMailboxId: 'mb-drafts',
        sentMailboxId: 'mb-sent',
        draft: { from: [{ email: 'me@x.com' }], to: [{ email: 'you@x.com' }], subject: 'Hi', text: 'Body' },
      });
      expect(result.id).toBe('new-1');
      expect(result.threadId).toBe('t-1');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'identityGet lists sending identities',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        const [name, args] = body.methodCalls[0];
        expect(name).toBe('Identity/get');
        expect(body.using).toContain('urn:ietf:params:jmap:submission');
        expect(args.accountId).toBe(ACCOUNT_ID);
        return {
          body: {
            methodResponses: [
              ['Identity/get', { accountId: ACCOUNT_ID, list: [{ id: 'id-1', email: 'me@x.com' }] }, '0'],
            ],
          },
        };
      };
      const result = yield* JmapMail.identityGet(TARGET);
      expect(result.list[0].email).toBe('me@x.com');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'emailSetUpdate patches an email (move to trash)',
    Effect.fnUntraced(function* ({ expect }) {
      respond = ({ body }) => {
        const [name, args] = body.methodCalls[0];
        expect(name).toBe('Email/set');
        expect(args.update).toEqual({ e1: { mailboxIds: { 'mb-trash': true } } });
        return { body: { methodResponses: [['Email/set', { accountId: ACCOUNT_ID, updated: { e1: null } }, '0']] } };
      };
      const result = yield* JmapMail.emailSetUpdate(TARGET, 'e1', { mailboxIds: { 'mb-trash': true } });
      expect(result.updated?.e1).toBeNull();
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a 401 status surfaces as a JmapApiError carrying the status',
    Effect.fnUntraced(function* ({ expect }) {
      respond = () => ({ status: 401, body: { type: 'about:blank', status: 401 } });
      const error = yield* Effect.flip(Jmap.getSession);
      expect(error).toBeInstanceOf(JmapApiError);
      expect(error.status).toBe(401);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a method-level error response surfaces as a JmapApiError carrying the type',
    Effect.fnUntraced(function* ({ expect }) {
      respond = () => ({
        body: { methodResponses: [['error', { type: 'unknownMethod', description: 'nope' }, '0']] },
      });
      const error = yield* Effect.flip(JmapMail.mailboxGet(TARGET));
      expect(error).toBeInstanceOf(JmapApiError);
      expect(error.type).toBe('unknownMethod');
    }, Effect.provide(TestLayer)),
  );
});
