//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { AccessToken } from '@dxos/link';

import { DISCORD_SOURCE } from '../constants.ts';
import { resolveDiscordToken } from './discord.ts';

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
