//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SandboxOperation } from '#types';

/** How long a token lives when its sandbox has no expiry of its own. */
const DEFAULT_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000;

export default SandboxOperation.GrantAccountAccess.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox }) {
      const loaded = yield* Database.load(sandbox);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const http = client.edge.http;

      // A token outliving its sandbox is a credential nothing uses and nobody remembers to revoke.
      const sandboxExpiry = loaded.expiresAt ? Date.parse(loaded.expiresAt) : Number.NaN;
      const expiresAt = sandboxExpiry > Date.now() ? sandboxExpiry : Date.now() + DEFAULT_TOKEN_LIFETIME;
      const minted = yield* Effect.promise(() =>
        http.createApiToken(Context.default(), { label: `Sandbox ${loaded.name ?? loaded.id}`, expiresAt }),
      );

      const accessToken = yield* Database.add(
        AccessToken.make({
          source: new URL(http.baseUrl).hostname,
          account: client.halo.identity.get()?.did,
          token: minted.token,
        }),
      );
      Obj.update(loaded, (loaded) => {
        loaded.credentials = [
          ...(loaded.credentials ?? []).filter(({ env }) => env !== SandboxOperation.ACCOUNT_TOKEN_ENV),
          { env: SandboxOperation.ACCOUNT_TOKEN_ENV, token: Ref.make(accessToken) },
        ];
      });

      return { env: SandboxOperation.ACCOUNT_TOKEN_ENV };
    }),
  ),
);
