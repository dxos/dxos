//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import { Database, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { AccessToken, Connection } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';

import { GOOGLE_INTEGRATION_SOURCE } from '../constants.ts';
import { GoogleCredentials } from './google-credentials.ts';

const TYPES = [AccessToken.AccessToken, Connection.Connection];

describe('GoogleCredentials', () => {
  test('returns a stored token without consulting EDGE', async ({ expect }) => {
    const { builder, db, accessTokens } = await seed([{ token: 'stored-token' }]);
    const resolver = trackingResolver('live-token');
    try {
      const token = await runFromAccessToken(db, resolver.layer, Ref.make(accessTokens[0]));

      expect(token).toEqual('stored-token');
      expect(resolver.calls).toEqual([]);
    } finally {
      await builder.close();
    }
  });

  test('resolves a managed placeholder transparently', async ({ expect }) => {
    const { builder, db, accessTokens } = await seed([{ token: MANAGED_ACCESS_TOKEN }]);
    const resolver = trackingResolver('live-token');
    try {
      const token = await runFromAccessToken(db, resolver.layer, Ref.make(accessTokens[0]));

      expect(token).toEqual('live-token');
      expect(resolver.calls).toEqual([{ accessTokenId: accessTokens[0].id }]);
    } finally {
      await builder.close();
    }
  });

  test('binds to the connection its own token, not another Google connection in the space', async ({ expect }) => {
    // A by-service lookup would pick among these arbitrarily, which is why the query is by id.
    const { builder, db, connection } = await seed([
      { token: 'first-account-token', account: 'first@example.com' },
      { token: 'second-account-token', account: 'second@example.com' },
    ]);
    const resolver = trackingResolver('live-token');
    try {
      const token = await runFromConnection(db, resolver.layer, Ref.make(connection));

      expect(token).toEqual('first-account-token');
    } finally {
      await builder.close();
    }
  });

  test('resolves on every read so a rotated token is picked up mid-run', async ({ expect }) => {
    const { builder, db, connection } = await seed([{ token: MANAGED_ACCESS_TOKEN }]);
    const resolver = trackingResolver('live-token');
    try {
      await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* GoogleCredentials.get();
          yield* GoogleCredentials.get();
        }).pipe(
          Effect.provide(GoogleCredentials.fromConnection(Ref.make(connection))),
          Effect.provide(credentialsLayerFromDatabase()),
          Effect.provide(Database.layer(db)),
          Effect.provide(resolver.layer),
        ),
      );

      expect(resolver.calls).toHaveLength(2);
    } finally {
      await builder.close();
    }
  });
});

/** Records what EDGE was asked for, so tests can assert it was (or wasn't) consulted. */
const trackingResolver = (liveToken: string) => {
  const calls: { accessTokenId: string }[] = [];
  const layer = Layer.succeed(Credential.AccessTokenResolver, {
    resolve: async ({ accessTokenId }) => {
      calls.push({ accessTokenId });
      return liveToken;
    },
  });
  return { calls, layer };
};

const seed = async (tokens: { token: string; account?: string }[]) => {
  const builder = await new EchoTestBuilder().open();
  const { db } = await builder.createDatabase({ types: TYPES });
  const accessTokens = tokens.map(({ token, account }) =>
    db.add(AccessToken.make({ source: GOOGLE_INTEGRATION_SOURCE, token, ...(account ? { account } : {}) })),
  );
  const connection = db.add(Connection.make({ connectorId: 'gmail', accessToken: Ref.make(accessTokens[0]) }));
  await db.flush({ indexes: true });
  return { builder, db, accessTokens, connection };
};

/** The real production shape: GoogleCredentials over CredentialsService over the database. */
const runFromAccessToken = (
  db: Database.Database,
  resolverLayer: Layer.Layer<Credential.AccessTokenResolver>,
  ref: Ref.Ref<AccessToken.AccessToken>,
) =>
  EffectEx.runPromise(
    GoogleCredentials.get().pipe(
      Effect.provide(GoogleCredentials.fromAccessToken(ref)),
      Effect.provide(credentialsLayerFromDatabase()),
      Effect.provide(Database.layer(db)),
      Effect.provide(resolverLayer),
    ),
  );

const runFromConnection = (
  db: Database.Database,
  resolverLayer: Layer.Layer<Credential.AccessTokenResolver>,
  ref: Ref.Ref<Connection.Connection>,
) =>
  EffectEx.runPromise(
    GoogleCredentials.get().pipe(
      Effect.provide(GoogleCredentials.fromConnection(ref)),
      Effect.provide(credentialsLayerFromDatabase()),
      Effect.provide(Database.layer(db)),
      Effect.provide(resolverLayer),
    ),
  );
