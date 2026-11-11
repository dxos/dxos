//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';
import { HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

export type BindTestAccountOptions = {
  /** Hub-service base URL, e.g. `https://preview.dxos.network/hub/`. */
  hubUrl: string;
  /** Defaults to an alias derived from the identity, so each identity gets its own account. */
  email?: string;
};

/**
 * Binds the client's identity to a Hub account through the `test+*@dxos.org` hatch, which hub-service honours only in
 * dev-like and preview environments; EDGE services that serve account holders only (calls-service) then admit it.
 * Returns the account id.
 */
export const bindTestAccount = (client: Client, { hubUrl, email }: BindTestAccountOptions) =>
  Effect.gen(function* () {
    const identity = client.halo.identity.get();
    invariant(identity, 'bindTestAccount needs an identity');
    const hub = new HubHttpClient(hubUrl);
    const response = yield* Effect.tryPromise(() =>
      hub.redeemInvitationCode(new Context(), {
        email: email ?? `test+story-${identity.did.slice(-12).toLowerCase()}@dxos.org`,
        identityDid: identity.did,
      }),
    ).pipe(
      // Two concurrent redeems of one email race to create the account and one fails; a repeat rebinds it.
      Effect.retry({ times: 4, schedule: Schedule.exponential('250 millis') }),
    );
    invariant('accountId' in response, 'hub-service did not bind an account');
    return response.accountId;
  });
