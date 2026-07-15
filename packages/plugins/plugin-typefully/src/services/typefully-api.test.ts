//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import { Publisher } from '@dxos/plugin-blogger/types';
import { Connection } from '@dxos/plugin-connector/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';
import { makeTypefullyPublisherService } from './typefully-api';

// Records what the stubbed `fetch` was called with so tests can assert the real
// request (method, URL, auth header, body) rather than that a function was called.
type RecordedCall = {
  url: string;
  method: string;
  apiKey: string | null;
  body: string;
};

const stubFetch = (respond: (call: RecordedCall) => Response) => {
  const calls: RecordedCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const call: RecordedCall = {
        url: request.url,
        method: request.method,
        apiKey: request.headers.get('X-API-KEY'),
        body: await request.clone().text(),
      };
      calls.push(call);
      return respond(call);
    }),
  );
  return calls;
};

describe('Typefully PublisherService', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Connection.Connection, AccessToken.AccessToken]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: TYPEFULLY_SOURCE, token: 'test-key' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: TYPEFULLY_CONNECTOR_ID, accessToken: Ref.make(token) }),
    );
    return { db, connection: Ref.make(connection) };
  };

  test('exposes provider identity matching the connector source', ({ expect }) => {
    const service = makeTypefullyPublisherService();
    expect(service.id).toBe('typefully');
    expect(service.label).toBe('Typefully');
    expect(service.source).toBe(TYPEFULLY_SOURCE);
  });

  test('createDraft POSTs to /v1/drafts/ with X-API-KEY Bearer auth and decodes the draft', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(() => Response.json({ id: 123, content: 'Hello world' }));

    const service = makeTypefullyPublisherService();
    const draft = await service.createDraft(connection, { text: 'Hello world' });

    expect(draft.id).toBe('123');
    expect(draft.text).toBe('Hello world');
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://api.typefully.com/v1/drafts/');
    // Verified against the Typefully v1 docs: auth is `X-API-KEY: Bearer <key>`.
    expect(calls[0].apiKey).toBe('Bearer test-key');
    expect(JSON.parse(calls[0].body)).toMatchObject({ content: 'Hello world' });
  });

  test('createDraft forwards a schedule date when provided', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(() => Response.json({ id: 5, content: 'later' }));

    const service = makeTypefullyPublisherService();
    await service.createDraft(connection, { text: 'later', scheduledAt: '2026-01-25T10:00:00Z' });

    expect(JSON.parse(calls[0].body)).toMatchObject({ 'content': 'later', 'schedule-date': '2026-01-25T10:00:00Z' });
  });

  test('listDrafts GETs recently-published and returns an array of drafts', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(() =>
      Response.json([
        { id: 1, content: 'a' },
        { id: 2, text: 'b' },
      ]),
    );

    const service = makeTypefullyPublisherService();
    const drafts = await service.listDrafts(connection);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ id: '1', text: 'a' });
    expect(drafts[1]).toMatchObject({ id: '2', text: 'b' });
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toBe('https://api.typefully.com/v1/drafts/recently-published/');
    expect(calls[0].apiKey).toBe('Bearer test-key');
  });

  test('getDraft, updateDraft and deleteDraft reject with PublisherError (unsupported by the v1 API)', async ({
    expect,
  }) => {
    const { connection } = await setup();
    // No network: unsupported verbs must fail fast without issuing a request.
    stubFetch(() => {
      throw new Error('unexpected network call');
    });

    const service = makeTypefullyPublisherService();
    await expect(service.getDraft(connection, 'x')).rejects.toBeInstanceOf(Publisher.PublisherError);
    await expect(service.updateDraft(connection, 'x', { text: 't' })).rejects.toBeInstanceOf(Publisher.PublisherError);
    await expect(service.deleteDraft(connection, 'x')).rejects.toBeInstanceOf(Publisher.PublisherError);
  });
});
