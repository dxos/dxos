//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Account from '@dxos/app-toolkit/Account';
import { CommandConfig, FormBuilder, print, syncAllToEdge, withTypes } from '@dxos/cli-util';
import { performRegisterOAuthFlow } from '@dxos/cli-util/oauth';
import { type Client, ClientService } from '@dxos/client';
import { type Identity } from '@dxos/client/halo';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection } from '@dxos/link';
import { ATPROTO_OAUTH_SCOPES, OAuthProvider } from '@dxos/protocols';

import { ClientOperation } from '#operations';

import {
  ATMOSPHERE_INPUT_PROMPT,
  ATMOSPHERE_METHOD,
  ATMOSPHERE_METHOD_TITLE,
  METHOD_ALIASES,
  hubClient,
  methodOption,
} from '../util.ts';

type SignupMethod = 'email' | typeof ATMOSPHERE_METHOD;

const SIGNUP_METHODS: SignupMethod[] = ['email', ATMOSPHERE_METHOD];

const METHOD_CHOICES = [
  { title: 'Email', value: 'email' as const },
  { title: ATMOSPHERE_METHOD_TITLE, value: ATMOSPHERE_METHOD },
];

const INPUT_PROMPT: Record<SignupMethod, string> = {
  email: 'Email address',
  [ATMOSPHERE_METHOD]: ATMOSPHERE_INPUT_PROMPT,
};

export const signup = Command.make(
  'signup',
  {
    code: Args.string('code').pipe(
      Args.withDescription('Access code (8-character invitation code) to redeem. Validated before signing up.'),
    ),
    input: Args.string('input').pipe(
      Args.withDescription('Method input: email address / Atmosphere handle. Prompted if omitted.'),
      Args.optional,
    ),
    method: methodOption(SIGNUP_METHODS, METHOD_ALIASES).pipe(
      Options.withDescription('Sign-up method (email | atmosphere). Prompted if omitted.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ code, input, method }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const manager = yield* Plugin.Service;
    const { invoke } = manager.capabilities.get(Capabilities.OperationInvoker);

    if (!Account.isValidAccessCodeFormat(code)) {
      return yield* Effect.fail(
        new Error(`Access code ${code} is malformed — codes are 8 characters (Crockford base32, hyphen optional).`),
      );
    }

    const hub = yield* hubClient;
    if (!(yield* Account.checkAccessCode({ hub, code }))) {
      return yield* Effect.fail(
        new Error(
          `Access code ${code} is not valid — it may be unknown, revoked, already redeemed, ` +
            'or the hub was unreachable.',
        ),
      );
    }

    const resolvedMethod: SignupMethod = Option.isSome(method)
      ? method.value
      : yield* Prompt.select({ message: 'Choose a sign-up method:', choices: METHOD_CHOICES }).pipe(Prompt.run);

    const resolvedInput = Option.isSome(input)
      ? input.value
      : yield* Prompt.text({ message: `${INPUT_PROMPT[resolvedMethod]}:` }).pipe(Prompt.run);

    const result = yield* Match.value(resolvedMethod).pipe(
      Match.when('email', () => signUpWithEmail({ client, hub, invoke, code, email: resolvedInput })),
      Match.when(ATMOSPHERE_METHOD, () => signUpWithAtmosphere({ client, hub, invoke, code, handle: resolvedInput })),
      Match.exhaustive,
    );

    // Provisions the EDGE agent, as the gate does once the Account exists. Non-fatal: the code is
    // already redeemed and the Account minted, so a provisioning failure must not fail the command
    // (a retry could not redeem again). Composer re-provisions the agent on every boot.
    yield* invoke(ClientOperation.CreateAgent).pipe(
      Effect.catch((error) =>
        warn(
          `account created, but the EDGE agent could not be provisioned (${String(error)}). ` +
            'Opening Composer will retry automatically.',
        ),
      ),
    );

    // `dx` force-exits as soon as the command returns, so the identity's spaces only reach EDGE if
    // they are drained here. Caught by cause: a sync timeout surfaces as a defect, not a typed error.
    yield* syncAllToEdge().pipe(
      Effect.catchCause((cause) =>
        warn(
          `account created, but the spaces could not be synced to EDGE (${Cause.pretty(cause)}). ` +
            'They will sync the next time this profile connects.',
        ),
      ),
    );

    const identity = client.halo.identity.get();
    invariant(identity, 'identity should exist after signup');
    // Hub keys accounts by identity DID, so redeem's `accountId` is that same DID -- reporting both
    // printed one value under two names.
    // TODO(wittjosiah): No way to finish email verification outside Composer: the emailed link
    // resolves in the app, and the hub exposes only `resendVerificationEmail`, so an account created
    // here stays unverified until the user opens Composer.
    const account = { email: result.email, emailVerificationSent: result.emailVerificationSent };
    if (json) {
      yield* Console.log(
        JSON.stringify({ ...account, identityDid: identity.did, displayName: identity.profile?.displayName }, null, 2),
      );
    } else {
      yield* Console.log('Signed up successfully');
      yield* Console.log(print(printAccount({ ...account, identityDid: identity.did })));
    }
  }),
).pipe(
  Command.withDescription('Sign up for a new DXOS account with an access code (same methods as Composer).'),
  // The Atmosphere method writes the connected account's credential to the default space.
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken, Connection.Connection)),
);

/** Non-fatal notice, on stderr so that `--json` leaves the account document alone on stdout. */
const warn = (message: string) => Console.error(`Warning: ${message}`);

const printAccount = (account: Omit<Account.SignUpResult, 'accountId'> & { identityDid: string }) =>
  FormBuilder.make({ title: 'Account' }).pipe(
    FormBuilder.set('email', account.email),
    FormBuilder.set('emailVerificationSent', String(account.emailVerificationSent)),
    FormBuilder.set('identityDid', account.identityDid),
    FormBuilder.build,
  );

type MethodParams = {
  client: Client;
  hub: ReturnType<typeof Account.createHubClient>;
  invoke: Capabilities.OperationInvoker['invoke'];
  code: string;
};

/**
 * The local identity outlives any failure past its creation, so failures after that point all
 * carry the same recovery guidance.
 */
const RECOVERY =
  'A local identity was created and remains bound to this profile; run `dx account logout` to ' +
  'clear it before retrying.';

/**
 * Email sign-up — {@link Account.signUpWithEmail} with the CLI's identity creation injected, and
 * the shared flow's typed errors translated to actionable CLI messages.
 */
const signUpWithEmail = Effect.fn(function* ({ client, hub, invoke, code, email }: MethodParams & { email: string }) {
  return yield* Account.signUpWithEmail({
    hub,
    email,
    code,
    ensureIdentity: ensureIdentity(client, invoke, email.split('@')[0]),
  }).pipe(
    Effect.catchTag('EmailAlreadyRegisteredError', () =>
      Effect.fail(new Error(`${email} already has an account. Run \`dx account login\` to sign in to it instead.`)),
    ),
    Effect.catchTag('EmailProbeUnavailableError', () =>
      Effect.fail(
        new Error(`Could not check whether ${email} already has an account. Nothing was created — try again.`),
      ),
    ),
    Effect.catchTag('AccountRedemptionError', (error) =>
      Effect.fail(new Error(`Could not redeem the access code for ${email} (${error.message}). ${RECOVERY}`)),
    ),
  );
});

/**
 * Atmosphere (atproto / Bluesky) OAuth sign-up, keeping the gate's OAuth-first ordering:
 * authenticate with the provider (local callback server + browser) before creating anything
 * locally, register the provider as a recovery method, then redeem the access code with the
 * provider-verified email.
 */
const signUpWithAtmosphere = Effect.fn(function* ({
  client,
  hub,
  invoke,
  code,
  handle,
}: MethodParams & { handle: string }) {
  const edgeBaseUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeBaseUrl, 'Edge services not configured (runtime.services.edge.url).');
  const { registrationToken } = yield* performRegisterOAuthFlow({
    edgeBaseUrl,
    provider: OAuthProvider.ATPROTO,
    scopes: ATPROTO_OAUTH_SCOPES,
    loginHint: handle,
  });

  // OAuth-first: the local identity is created only once the provider has authenticated the user,
  // so a failed or abandoned auth leaves nothing behind.
  const identity = yield* ensureIdentity(client, invoke);
  const { email } = yield* Account.completeOAuthRegistration({ client, registrationToken }).pipe(
    Effect.mapError((error) => new Error(`${error.message} ${RECOVERY}`)),
  );

  // The credential written to the default space rides out with the command's `syncAllToEdge`.
  return yield* Account.redeemAccessCode({ hub, identity, email, code }).pipe(
    Effect.catchTag('AccountRedemptionError', (error) =>
      Effect.fail(new Error(`Could not redeem the access code for ${email} (${error.message}). ${RECOVERY}`)),
    ),
  );
});

/** Create the local identity unless this profile already has one. */
const ensureIdentity = (client: Client, invoke: Capabilities.OperationInvoker['invoke'], displayName?: string) =>
  Effect.gen(function* () {
    const existing = client.halo.identity.get();
    if (existing) {
      return existing;
    }
    // `CreateIdentity` fires `IdentityCreated`, which is what provisions the identity's spaces.
    yield* invoke(ClientOperation.CreateIdentity, { displayName });
    const identity: Identity | null = client.halo.identity.get();
    invariant(identity, 'identity should exist after create');
    return identity;
  });
