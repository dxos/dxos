//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { Database, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { type Sandbox, SandboxOperation } from '#types';

/** How long a token lives when its sandbox has no expiry of its own. */
const DEFAULT_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000;

/**
 * Mints an API token bound to the reader's identity, expiring with the sandbox, and stores it on the sandbox as
 * {@link SandboxOperation.ACCOUNT_TOKEN_ENV} so every command in it can act as their account.
 */
export const mintAccountToken = Effect.fn(function* (sandbox: Sandbox.Sandbox) {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const http = client.edge.http;

  // A token outliving its sandbox is a credential nothing uses and nobody remembers to revoke.
  const sandboxExpiry = sandbox.expiresAt ? Date.parse(sandbox.expiresAt) : Number.NaN;
  const expiresAt = sandboxExpiry > Date.now() ? sandboxExpiry : Date.now() + DEFAULT_TOKEN_LIFETIME;
  const minted = yield* Effect.tryPromise(() =>
    http.createApiToken(Context.default(), { label: `Sandbox ${sandbox.name ?? sandbox.id}`, expiresAt }),
  );

  const accessToken = yield* Database.add(
    AccessToken.make({
      source: new URL(http.baseUrl).hostname,
      account: client.halo.identity.get()?.did,
      token: minted.token,
    }),
  );
  const previous = (sandbox.credentials ?? []).filter(({ env }) => env === SandboxOperation.ACCOUNT_TOKEN_ENV);
  Obj.update(sandbox, (sandbox) => {
    sandbox.credentials = [
      ...(sandbox.credentials ?? []).filter(({ env }) => env !== SandboxOperation.ACCOUNT_TOKEN_ENV),
      { env: SandboxOperation.ACCOUNT_TOKEN_ENV, token: Ref.make(accessToken) },
    ];
  });

  // A replaced token left in the space is a live credential nothing references any more.
  for (const { token } of previous) {
    const stale = yield* Database.load(token).pipe(Effect.option);
    if (Option.isSome(stale)) {
      yield* Database.remove(stale.value);
    }
  }

  return SandboxOperation.ACCOUNT_TOKEN_ENV;
});
