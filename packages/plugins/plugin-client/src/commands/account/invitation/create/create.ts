//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import * as Account from '@dxos/app-toolkit/Account';
import { CommandConfig } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context as DxContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  // `client.initialize()` is forked off startup, and `client.halo` throws until it lands.
  yield* Effect.tryPromise(() => client.waitUntilInitialized());
  invariant(client.halo.identity.get(), 'Not logged in. Run `dx account login` first.');

  // Codes are issued against the caller's own account quota, so the request has to be
  // authenticated -- the hub answers an unidentified client with a challenge it cannot sign.
  const hub = Account.createHubClient(client);
  hub.setIdentity(createEdgeIdentity(client));

  const { code } = yield* Effect.tryPromise({
    try: () => hub.issueAccountInvitation(DxContext.default()),
    catch: (cause) =>
      new Error(
        `Could not issue an invitation code (${cause instanceof Error ? cause.message : String(cause)}). ` +
          'Each account may issue a limited number of invitations, so an exhausted quota fails here too.',
      ),
  });

  if (json) {
    yield* Console.log(JSON.stringify({ code }, null, 2));
  } else {
    yield* Console.log(code);
  }
});

export const create = Command.make('create', {}, handler).pipe(
  Command.withDescription('Issue an invitation code, redeemable once with `dx account signup <CODE>`.'),
);
