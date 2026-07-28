//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

import { HubApi, type LocalIdentity, SignupIdentity } from './services';

export type SignupOutcome =
  | { readonly _tag: 'AccountCreated'; readonly email: string; readonly identity: LocalIdentity }
  | { readonly _tag: 'IdentityRestored'; readonly email: string; readonly identity: LocalIdentity }
  | { readonly _tag: 'EmailSent'; readonly email: string };

export class SignupFailedError extends BaseError.extend('SignupFailedError', 'Signup failed') {}

/**
 * Email signup, mirroring the gate's Login tab: ask the hub, and when it replies that a local
 * identity is required, create one and retry with the DID. A `token` instead means an account
 * already exists and we restore it. Admission is checked before the token, matching the gate.
 *
 * An empty response is ambiguous by design — the endpoint is enumeration-safe and its 5/min rate
 * limit answers the same way — so it always reports as "check your email".
 */
export const signupWithEmail = ({ email, agent }: { email: string; agent: boolean }) =>
  Effect.gen(function* () {
    const hub = yield* HubApi;
    const identityService = yield* SignupIdentity;

    const restore = (token: string) =>
      Effect.gen(function* () {
        yield* identityService.redeemToken(token);
        const identity = yield* identityService.read;
        if (!identity) {
          return yield* Effect.fail(
            new SignupFailedError({ message: 'Token redeemed but no local identity is present.' }),
          );
        }
        return { _tag: 'IdentityRestored', email, identity } satisfies SignupOutcome;
      });

    const first = yield* hub.login({ email });

    if (first.needsIdentity) {
      const identity = yield* identityService.ensure(email);
      const second = yield* hub.login({
        email,
        identityDid: identity.identityDid,
        identityKey: identity.identityKey,
      });
      if (second.admitted) {
        if (agent) {
          yield* identityService.createAgent;
        }
        return { _tag: 'AccountCreated', email, identity } satisfies SignupOutcome;
      }
      if (second.token) {
        return yield* restore(second.token);
      }
      return { _tag: 'EmailSent', email } satisfies SignupOutcome;
    }

    if (first.token) {
      return yield* restore(first.token);
    }

    return { _tag: 'EmailSent', email } satisfies SignupOutcome;
  });
