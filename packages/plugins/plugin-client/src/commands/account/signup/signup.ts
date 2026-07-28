//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Plugin } from '@dxos/app-framework';
import { CommandConfig, print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Context as DxContext } from '@dxos/context';
import { HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

import { ClientOperation } from '#operations';

import { printIdentity } from '../../halo/util';

/** Same permissive shape the gate accepts; the hub is the real authority. */
const isValidEmail = (email: string) => /.+@.+\..+/.test(email);

export const signup = Command.make(
  'signup',
  {
    email: Options.text('email').pipe(
      Options.filterMap(
        (value) => (isValidEmail(value) ? Option.some(value) : Option.none()),
        'Not a valid email address.',
      ),
      Options.withDescription('Email address to register. Prompted if omitted.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ email }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const manager = yield* Plugin.Service;
    const { invoke } = manager.capabilities.get(Capabilities.OperationInvoker);

    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    invariant(hubUrl, 'Hub URL not configured (runtime.app.env.DX_HUB_URL).');
    const hub = new HubHttpClient(hubUrl);

    const resolvedEmail = Option.isSome(email)
      ? email.value
      : yield* Prompt.text({ message: 'Email address' }).pipe(Prompt.run);

    let result = yield* Effect.tryPromise(() => hub.login(DxContext.default(), { email: resolvedEmail }));

    // Server signaled that this email needs a local identity to bind a fresh Account: create one and
    // retry. `CreateIdentity` fires `IdentityCreated`, which is what provisions the personal space.
    if (result.needsIdentity) {
      yield* invoke(ClientOperation.CreateIdentity, { displayName: resolvedEmail.split('@')[0] });
      const newIdentity = client.halo.identity.get();
      invariant(newIdentity, 'identity should exist after create');
      result = yield* Effect.tryPromise(() =>
        hub.login(DxContext.default(), {
          email: resolvedEmail,
          identityDid: newIdentity.did,
          identityKey: newIdentity.identityKey.toHex(),
        }),
      );
    }

    if (result.admitted) {
      // Direct admission: the identity is already local, so there is nothing to recover.
      yield* invoke(ClientOperation.CreateAgent);
    } else if (result.token) {
      // Inline token: the hub matched the email and handed us a recovery token.
      yield* invoke(ClientOperation.RedeemToken, { token: result.token });
    } else {
      // No account for this email, or the link was mailed out-of-band. The response is identical in
      // both cases so the endpoint stays enumeration-safe; report the gate's check-email copy.
      if (json) {
        return yield* Console.log(JSON.stringify({ emailSent: true, email: resolvedEmail }, null, 2));
      }
      yield* Console.log('Please check your email.');
      return yield* Console.log(
        `A login link has been sent to ${resolvedEmail}. If it doesn't arrive in the next three minutes please check your spam folder.`,
      );
    }

    const identity = client.halo.identity.get();
    invariant(identity, 'identity should exist after signup');
    if (json) {
      yield* Console.log(
        JSON.stringify({ identityDid: identity.did, displayName: identity.profile?.displayName }, null, 2),
      );
    } else {
      yield* Console.log('Signed up successfully');
      yield* Console.log(print(printIdentity({ identityDid: identity.did, profile: identity.profile })));
    }
  }),
).pipe(Command.withDescription('Create a DXOS identity and Hub account by email.'));
