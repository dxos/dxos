//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';

import { GITHUB_SOURCE } from '../constants.ts';
import { GitHubConnectionUnavailableError } from '../errors.ts';
import { GitHubCredentials, fromAccessToken } from './github-api.ts';

describe('fromAccessToken', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Sync has no anonymous fallback: an App token EDGE will not mint must stop it, as a connection
  // to reauthenticate (status 401), rather than let it run unauthenticated.
  test('fails when a custodied token cannot be resolved', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken]);
    const accessToken = db.add(
      Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: MANAGED_ACCESS_TOKEN }),
    );
    const unresolvable = Layer.succeed(Credential.CredentialsService, {
      queryCredentials: async () => [],
      getCredential: async () => {
        throw new Error('installation is gone');
      },
    });

    // A typed failure, so a sync's `Effect.result` captures it and stamps it on the binding.
    const error = await EffectEx.runPromise(
      GitHubCredentials.pipe(
        Effect.provide(
          fromAccessToken(Ref.make(accessToken)).pipe(Layer.provide(Layer.merge(Database.layer(db), unresolvable))),
        ),
        Effect.flip,
      ),
    );

    expect(GitHubConnectionUnavailableError.is(error)).toBe(true);
    expect((error as GitHubConnectionUnavailableError).context).toMatchObject({ status: 401 });
  });
});
