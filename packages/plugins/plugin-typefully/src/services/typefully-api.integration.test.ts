//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import { Connection } from '@dxos/plugin-connector/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';
import { makeTypefullyPublisherService } from './typefully-api';

//
// Live integration test against the real Typefully v2 API. Skipped unless TYPEFULLY_API_KEY is set,
// so it never runs in CI (no secret) but can be exercised on demand:
//
//   TYPEFULLY_API_KEY=<v2-key> moon run plugin-typefully:test -- typefully-api.integration.test.ts
//
// It drives the same proxy-wired `makeTypefullyPublisherService` the app uses, so it covers the full
// path the offline contract tests (typefully-api.test.ts) cannot: edge CORS proxy → Typefully v2 →
// Bearer auth → social-set resolution → response parsing. These are the exact calls `SyncPosts`
// (plugin-blogger) makes, so a green run here means sync's network layer works end-to-end.
//
// The create test writes a real draft to the connected account and deletes it again for cleanup.
//

const apiKey = process.env.TYPEFULLY_API_KEY;

describe.skipIf(!apiKey)('Typefully PublisherService (live)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Materialize a Connection carrying the live key, exactly as the connector flow would.
  const connect = async (key: string): Promise<Ref.Ref<Connection.Connection>> => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Connection.Connection, AccessToken.AccessToken]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: TYPEFULLY_SOURCE, token: key }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: TYPEFULLY_CONNECTOR_ID, accessToken: Ref.make(token) }),
    );
    return Ref.make(connection);
  };

  test('listDrafts authenticates (resolves the social set) and returns an array', async ({ expect }) => {
    if (!apiKey) {
      return; // Unreachable when the suite runs; narrows `apiKey` to string without a cast.
    }

    const drafts = await makeTypefullyPublisherService().listDrafts(await connect(apiKey));
    expect(Array.isArray(drafts)).toBe(true);
    for (const draft of drafts) {
      expect(typeof draft.id).toBe('string');
      expect(typeof draft.text).toBe('string');
    }
  });

  test('createDraft then deleteDraft round-trips a real draft', async ({ expect }) => {
    if (!apiKey) {
      return;
    }

    const service = makeTypefullyPublisherService();
    const connection = await connect(apiKey);
    // A recognizable marker so a leaked draft (if cleanup fails) is easy to spot and remove manually.
    const text = `DXOS Typefully sync integration test — ${new Date().toISOString()}`;

    const created = await service.createDraft(connection, { text });
    // Cleanup in `finally` so a failed assertion never leaks the draft (a create can succeed remotely
    // even if a later assertion throws).
    try {
      expect(created.id).toBeTruthy();
      expect(created.text).toContain('DXOS Typefully sync integration test');
    } finally {
      await service.deleteDraft(connection, created.id);
    }
  });
});
