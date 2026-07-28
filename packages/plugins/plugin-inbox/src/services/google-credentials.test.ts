//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Credential } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { AccessToken } from '@dxos/link';
import { Connection } from '@dxos/plugin-connector';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';

import { GoogleCredentials } from './google-credentials';

const TYPES = [AccessToken.AccessToken, Connection.Connection];

/** `get()` keeps a CredentialsService requirement for its no-token fallback, never reached here. */
const unusedCredentials = Layer.succeed(Credential.CredentialsService, {
  queryCredentials: () => Promise.reject(new Error('unused: the token is on the object')),
  getCredential: () => Promise.reject(new Error('unused: the token is on the object')),
});

/** Records what the resolver was asked for, so tests can assert it was (or wasn't) consulted. */
const trackingResolver = (liveToken: string) => {
  const calls: { spaceId: string; accessTokenId: string }[] = [];
  const layer = Layer.succeed(Credential.AccessTokenResolver, {
    resolve: async ({ spaceId, accessTokenId }) => {
      calls.push({ spaceId, accessTokenId });
      return liveToken;
    },
  });
  return { calls, layer };
};

const seed = async (token: string) => {
  const builder = await new EchoTestBuilder().open();
  const { db } = await builder.createDatabase({ types: TYPES });
  const accessToken = db.add(AccessToken.make({ source: 'google.com', token }));
  const connection = db.add(Connection.make({ connectorId: 'gmail', accessToken: Ref.make(accessToken) }));
  await db.flush({ indexes: true });
  return { builder, db, accessToken, connection };
};

describe('GoogleCredentials', () => {
  test('returns a stored token verbatim without consulting the resolver', async ({ expect }) => {
    const { builder, db, accessToken } = await seed('stored-token');
    const resolver = trackingResolver('live-token');
    try {
      const token = await EffectEx.runPromise(
        GoogleCredentials.get().pipe(
          Effect.provide(GoogleCredentials.fromAccessToken(Ref.make(accessToken))),
          Effect.provide(Database.layer(db)),
          Effect.provide(resolver.layer),
          Effect.provide(unusedCredentials),
        ),
      );

      expect(token).toEqual('stored-token');
      expect(resolver.calls).toEqual([]);
    } finally {
      await builder.close();
    }
  });

  test('resolves the placeholder to the live token, keyed by space and token id', async ({ expect }) => {
    const { builder, db, accessToken } = await seed(MANAGED_ACCESS_TOKEN);
    const resolver = trackingResolver('live-token');
    try {
      const token = await EffectEx.runPromise(
        GoogleCredentials.get().pipe(
          Effect.provide(GoogleCredentials.fromAccessToken(Ref.make(accessToken))),
          Effect.provide(Database.layer(db)),
          Effect.provide(resolver.layer),
          Effect.provide(unusedCredentials),
        ),
      );

      expect(token).toEqual('live-token');
      expect(resolver.calls).toEqual([{ spaceId: db.spaceId, accessTokenId: accessToken.id }]);
    } finally {
      await builder.close();
    }
  });

  test('resolves on every read so a rotated token is picked up mid-run', async ({ expect }) => {
    const { builder, db, connection } = await seed(MANAGED_ACCESS_TOKEN);
    const resolver = trackingResolver('live-token');
    try {
      // One layer instance, two reads — the resolver is captured at build time but called per `get`.
      await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* GoogleCredentials.get();
          yield* GoogleCredentials.get();
        }).pipe(
          Effect.provide(GoogleCredentials.fromConnection(Ref.make(connection))),
          Effect.provide(Database.layer(db)),
          Effect.provide(resolver.layer),
          Effect.provide(unusedCredentials),
        ),
      );

      expect(resolver.calls).toHaveLength(2);
    } finally {
      await builder.close();
    }
  });
});
