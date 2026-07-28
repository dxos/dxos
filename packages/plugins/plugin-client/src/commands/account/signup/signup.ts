//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { CommandConfig, FormBuilder, print } from '@dxos/cli-util';

import { type SignupOutcome, signupWithEmail } from './flow';
import { HubApi, type LocalIdentity, SignupIdentity, resolveHubUrl } from './services';

/** Same permissive shape the gate accepts; the hub is the real authority. */
const isValidEmail = (email: string) => /.+@.+\..+/.test(email);

const identityForm = (identity: LocalIdentity) =>
  FormBuilder.make({ title: 'Identity' }).pipe(
    FormBuilder.set('identityDid', identity.identityDid),
    FormBuilder.set('displayName', identity.displayName ?? '<none>'),
    FormBuilder.build,
  );

const report = (outcome: SignupOutcome, json: boolean): Effect.Effect<void> => {
  if (json) {
    return Console.log(JSON.stringify(outcome, null, 2));
  }

  switch (outcome._tag) {
    case 'AccountCreated':
      return Effect.gen(function* () {
        yield* Console.log(`Account created for ${outcome.email}.`);
        yield* Console.log(print(identityForm(outcome.identity)));
      });
    case 'IdentityRestored':
      return Effect.gen(function* () {
        yield* Console.log(`Restored the existing identity for ${outcome.email}.`);
        yield* Console.log(print(identityForm(outcome.identity)));
      });
    // Mirrors the gate's `check-email` copy: the hub answers identically for an unapproved
    // address, an unknown one, and a rate-limited request, so we cannot say more than this.
    case 'EmailSent':
      return Effect.gen(function* () {
        yield* Console.log('Please check your email.');
        yield* Console.log(
          `A login link has been sent to ${outcome.email}. If it doesn't arrive in the next three minutes please check your spam folder.`,
        );
      });
  }
};

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
    agent: Options.boolean('no-agent', { ifPresent: false }).pipe(
      Options.withDescription('Do not create an EDGE agent for the new identity.'),
    ),
    hubUrl: Options.text('hub-url').pipe(
      Options.withDescription('Hub service URL. Defaults to the configured hub.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ email, agent, hubUrl }) {
    const { json } = yield* CommandConfig;

    const resolvedEmail = Option.isSome(email)
      ? email.value
      : yield* Prompt.text({ message: 'Email address:' }).pipe(Prompt.run);

    const resolvedHubUrl = yield* resolveHubUrl(hubUrl);
    const services = Layer.merge(HubApi.layer(resolvedHubUrl), SignupIdentity.layer);

    const outcome = yield* signupWithEmail({ email: resolvedEmail, agent }).pipe(Effect.provide(services));
    yield* report(outcome, json);
  }),
).pipe(Command.withDescription('Create a DXOS identity and Hub account by email.'));
