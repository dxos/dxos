//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';
import { HubHttpClient } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { EdgeCallFailedError } from '@dxos/protocols';

export class BindTestAccountError extends BaseError.extend('BindTestAccountError', 'Could not bind a test account.') {}

export type BindTestAccountOptions = {
  /** Hub-service base URL, e.g. `https://preview.dxos.network/hub/`. */
  hubUrl: string;
  /** Defaults to an alias derived from the identity, so each identity gets its own account. */
  email?: string;
};

/**
 * Two concurrent redeems of one email race to create the account, and the loser gets a 5xx; a dropped connection has no
 * status. Anything else (the hatch is off outside dev-like and preview hubs, a 429) will not change within a retry.
 */
const isTransient = (error: BindTestAccountError): boolean =>
  !(error.cause instanceof EdgeCallFailedError) || error.cause.status === undefined || error.cause.status >= 500;

/**
 * Binds the client's identity to a Hub account through the `test+*@dxos.org` hatch, which hub-service honours only in
 * dev-like and preview environments; EDGE services that serve account holders only (calls-service) then admit it.
 * Returns the account id.
 *
 * The default email is unique per identity, so every identity creates its own account row, and nothing removes them.
 * That is deliberate: redeeming a shared email rebinds its account to the newest identity, which would revoke every
 * other tab's access.
 */
export const bindTestAccount = Effect.fnUntraced(function* (client: Client, { hubUrl, email }: BindTestAccountOptions) {
  const identity = client.halo.identity.get();
  invariant(identity, 'bindTestAccount needs an identity');
  const hub = new HubHttpClient(hubUrl);
  const response = yield* Effect.tryPromise({
    try: () =>
      hub.redeemInvitationCode(new Context(), {
        email: email ?? `test+story-${identity.did.slice(-12).toLowerCase()}@dxos.org`,
        identityDid: identity.did,
      }),
    catch: (cause) => new BindTestAccountError({ cause }),
  }).pipe(Effect.retry({ times: 4, schedule: Schedule.exponential('250 millis'), while: isTransient }));
  invariant('accountId' in response, 'hub-service did not bind an account');
  return response.accountId;
});
