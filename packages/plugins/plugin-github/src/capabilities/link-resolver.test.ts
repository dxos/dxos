//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';

import { GITHUB_APP_PROVIDER_ID, GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants.ts';
import { connectionTokens } from './link-resolver.ts';

describe('connectionTokens', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // A preview tries each connection in turn, then anonymous: one whose token cannot be resolved is
  // skipped rather than costing the others (and the anonymous attempt) their turn.
  test('skips a connection whose token cannot be resolved', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken, Connection.Connection]);
    for (const [token, connectorId] of [
      [MANAGED_ACCESS_TOKEN, GITHUB_APP_PROVIDER_ID],
      ['gho_user', GITHUB_PROVIDER_ID],
    ]) {
      const accessToken = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token }));
      db.add(Obj.make(Connection.Connection, { connectorId, accessToken: Ref.make(accessToken) }));
    }

    // No service resolver: the custodied token has no credentials service to ask.
    const tokens = await EffectEx.runPromise(connectionTokens(db, undefined));

    expect(tokens).toEqual(['gho_user']);
  });
});
