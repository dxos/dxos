//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken } from '@dxos/link';

import { DISCORD_SOURCE } from '../constants.ts';
import {
  DiscordHttp,
  type HttpRequest,
  makeDiscordLayerFromToken,
  makeDiscordUserLayerFromToken,
  resolveDiscordToken,
} from './discord.ts';

describe('DiscordHttp', () => {
  test('a host that serves it sends the request, by its path below the API base', async ({ expect }) => {
    const http = recordingHttp([]);
    const messages = await EffectEx.runPromise(
      Effect.gen(function* () {
        const rest = yield* DiscordREST;
        return yield* rest.listMessages('c1', { limit: 5 });
      }).pipe(Effect.provide(makeDiscordLayerFromToken('bot-token').pipe(Layer.provide(http.layer)))),
    );
    expect(messages).toEqual([]);
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]).toMatchObject({ method: 'GET', path: '/channels/c1/messages?limit=5' });
    expect(http.requests[0].headers.authorization).toBe('Bot bot-token');
  });

  test('a user token travels as a bearer token', async ({ expect }) => {
    const http = recordingHttp([]);
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const rest = yield* DiscordREST;
        return yield* rest.listMessages('c1', { limit: 5 });
      }).pipe(Effect.provide(makeDiscordUserLayerFromToken('user-token').pipe(Layer.provide(http.layer)))),
    );
    expect(http.requests[0].headers.authorization).toBe('Bearer user-token');
  });
});

/** Records every query so a test can assert the lookup is by id, not by service. */
const trackingCredentials = (apiKey: string) => {
  const queries: Credential.CredentialQuery[] = [];
  const layer = Layer.succeed(Credential.CredentialsService, {
    queryCredentials: async (query) => {
      queries.push(query);
      return [{ service: DISCORD_SOURCE, apiKey }];
    },
    getCredential: async (query) => {
      queries.push(query);
      return { service: DISCORD_SOURCE, apiKey };
    },
  });
  return { queries, layer };
};

describe('resolveDiscordToken', () => {
  test('resolves through CredentialsService by access token id', async ({ expect }) => {
    const accessToken = Obj.make(AccessToken.AccessToken, { source: DISCORD_SOURCE, token: 'inline-token' });
    const credentials = trackingCredentials('resolved-token');

    const token = await EffectEx.runPromise(resolveDiscordToken(accessToken).pipe(Effect.provide(credentials.layer)));

    expect(token).toEqual('resolved-token');
    expect(credentials.queries).toEqual([{ accessTokenId: accessToken.id }]);
  });
});

/** A {@link DiscordHttp} that records each request and answers it with `body` as JSON. */
const recordingHttp = (body: unknown) => {
  const requests: HttpRequest[] = [];
  const layer = Layer.succeed(
    DiscordHttp,
    DiscordHttp.of({
      fetch: (request) =>
        Effect.sync(() => {
          requests.push(request);
          return {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: btoa(JSON.stringify(body)),
          };
        }),
    }),
  );
  return { requests, layer };
};
