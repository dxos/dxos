//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import { Connection } from '@dxos/plugin-connector/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';
import { makeTypefullyPublisherService } from './typefully-api';

const PROXY = 'https://cors-proxy.dxos.workers.dev/api.typefully.com/v2';

// Records what the stubbed `fetch` was called with so tests can assert the real request (method, URL,
// auth header, body). Requests are routed through the DXOS CORS proxy, which relays the caller's
// `Authorization` as `X-Cors-Proxy-Authorization`, so that is where the Bearer token is asserted.
type RecordedCall = {
  url: string;
  method: string;
  auth: string | null;
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
        auth: request.headers.get('X-Cors-Proxy-Authorization'),
        body: await request.clone().text(),
      };
      calls.push(call);
      return respond(call);
    }),
  );
  return calls;
};

// Routes `GET /social-sets` to a personal set + a team set (`ss1`); everything else to `rest`. The
// team set must be chosen (sync targets the team), so downstream calls are expected under `ss1`.
const withSocialSet = (rest: (call: RecordedCall) => Response) => (call: RecordedCall) =>
  call.url.endsWith('/v2/social-sets')
    ? Response.json({ results: [{ id: 'personal' }, { id: 'ss1', team: { id: 't1', name: 'Team' } }] })
    : rest(call);

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
    expect(service.connectorId).toBe(TYPEFULLY_CONNECTOR_ID);
  });

  test('createDraft resolves the social set then POSTs a v2 draft with Bearer auth and platform body', async ({
    expect,
  }) => {
    const { connection } = await setup();
    const calls = stubFetch(
      withSocialSet(() => Response.json({ id: 123, platforms: { x: { posts: [{ text: 'Hello world' }] } } })),
    );

    const service = makeTypefullyPublisherService();
    const draft = await service.createDraft(connection, { text: 'Hello world' });

    expect(draft.id).toBe('123');
    expect(draft.text).toBe('Hello world');
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(`${PROXY}/social-sets`);
    expect(calls[1].method).toBe('POST');
    expect(calls[1].url).toBe(`${PROXY}/social-sets/ss1/drafts`);
    // v2 auth is `Authorization: Bearer <key>`, relayed by the proxy as `X-Cors-Proxy-Authorization`.
    expect(calls[1].auth).toBe('Bearer test-key');
    expect(JSON.parse(calls[1].body)).toMatchObject({
      platforms: { x: { enabled: true, posts: [{ text: 'Hello world' }] } },
    });
  });

  test('createDraft forwards a schedule date as publish_at', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(
      withSocialSet(() => Response.json({ id: 5, platforms: { x: { posts: [{ text: 'later' }] } } })),
    );

    const service = makeTypefullyPublisherService();
    await service.createDraft(connection, { text: 'later', scheduledAt: '2026-01-25T10:00:00Z' });

    expect(JSON.parse(calls[1].body)).toMatchObject({ publish_at: '2026-01-25T10:00:00Z' });
  });

  test('listDrafts GETs the social set drafts and maps platform post text', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(
      withSocialSet(() =>
        Response.json({
          results: [
            { id: 1, platforms: { x: { posts: [{ text: 'a' }] } } },
            { id: 2, platforms: { x: { posts: [{ text: 'b1' }, { text: 'b2' }] } } },
          ],
        }),
      ),
    );

    const service = makeTypefullyPublisherService();
    const drafts = await service.listDrafts(connection);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ id: '1', text: 'a' });
    // A thread of posts is joined into a single body.
    expect(drafts[1]).toMatchObject({ id: '2', text: 'b1\n\nb2' });
    expect(calls[1].method).toBe('GET');
    expect(calls[1].url).toBe(`${PROXY}/social-sets/ss1/drafts`);
    expect(calls[1].auth).toBe('Bearer test-key');
  });

  test('updateDraft PATCHes the draft with the new platform body', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(
      withSocialSet(() => Response.json({ id: 7, platforms: { x: { posts: [{ text: 'edited' }] } } })),
    );

    const service = makeTypefullyPublisherService();
    const draft = await service.updateDraft(connection, '7', { text: 'edited' });

    expect(draft.text).toBe('edited');
    expect(calls[1].method).toBe('PATCH');
    expect(calls[1].url).toBe(`${PROXY}/social-sets/ss1/drafts/7`);
    expect(JSON.parse(calls[1].body)).toMatchObject({ platforms: { x: { posts: [{ text: 'edited' }] } } });
  });

  test('deleteDraft DELETEs the draft', async ({ expect }) => {
    const { connection } = await setup();
    const calls = stubFetch(withSocialSet(() => new Response(null, { status: 204 })));

    const service = makeTypefullyPublisherService();
    await service.deleteDraft(connection, '9');

    expect(calls[1].method).toBe('DELETE');
    expect(calls[1].url).toBe(`${PROXY}/social-sets/ss1/drafts/9`);
  });
});
