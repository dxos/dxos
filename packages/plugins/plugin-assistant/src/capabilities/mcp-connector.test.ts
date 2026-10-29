//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken, Connection } from '@dxos/link';
import { startTestServer } from '@dxos/mcp-client/testing';

import { McpServerConnector } from './mcp-connector.ts';

const withTestServer = Effect.acquireRelease(
  Effect.promise(() => startTestServer()),
  (server) => Effect.promise(() => server.close()),
);

const submit = (values: { url: string; token?: string }) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const form = McpServerConnector.credentialForm;
    if (!form) {
      return yield* Effect.die(new Error('The Custom MCP Server connector has no form.'));
    }
    return yield* form.onSubmit({ values, connector: McpServerConnector, db });
  });

const TestLayer = TestDatabaseLayer({ types: [AccessToken.AccessToken, Connection.Connection] });

describe('Custom MCP Server connector', () => {
  it.effect(
    'probes the URL to choose how the connection authenticates',
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;

      const open = yield* submit({ url: server.urls.open });
      expect(open.kind === 'complete' && open.accessToken).toBe(undefined);
      expect(open.kind === 'complete' && open.connection.mcp).toEqual({ url: server.urls.open, protocol: 'http' });

      const keyed = yield* submit({ url: server.urls.key, token: server.apiKey });
      expect(keyed.kind === 'complete' && keyed.accessToken?.token).toBe(server.apiKey);

      const rejected = yield* submit({ url: server.urls.key, token: 'wrong' }).pipe(Effect.flip);
      expect(rejected.message).toMatch(/rejected/);

      const signIn = yield* submit({ url: server.urls.oauth });
      expect(signIn).toEqual({ kind: 'mcp-oauth', endpoint: { url: server.urls.oauth, protocol: 'http' } });
    }, Effect.provide(TestLayer)),
  );
});
