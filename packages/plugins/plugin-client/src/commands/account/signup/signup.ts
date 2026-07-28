//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { Capabilities, Plugin } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import {
  CommandConfig,
  FormBuilder,
  flushAndSync,
  performRegisterOAuthFlow,
  print,
  spaceLayer,
  withTypes,
} from '@dxos/cli-util';
import { type Client, ClientService } from '@dxos/client';
import { type Identity } from '@dxos/client/halo';
import { Context as DxContext } from '@dxos/context';
import { Ref } from '@dxos/echo';
import { type HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { AccessToken, Atmosphere, Connection } from '@dxos/link';
import { ATPROTO_OAUTH_SCOPES, OAuthProvider } from '@dxos/protocols';

import { ClientOperation } from '#operations';

import {
  ATMOSPHERE_INPUT_PROMPT,
  ATMOSPHERE_METHOD,
  ATMOSPHERE_METHOD_TITLE,
  METHOD_ALIASES,
  hubClient,
  methodOption,
  normalizeAccessCode,
  validAccessCode,
} from '../util';

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

/** Result of a successful sign-up, from whichever method minted the Account. */
type SignupResult = {
  /** Address bound to the Account: user-supplied (email) or provider-verified (atproto). */
  email: string;
  accountId: string;
  emailVerificationSent: boolean;
};

export const signup = Command.make(
  'signup',
  {
    code: Args.text({ name: 'code' }).pipe(
      Args.withDescription('Access code (8-character invitation code) to redeem. Validated before signing up.'),
    ),
    input: Args.text({ name: 'input' }).pipe(
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

    if (!validAccessCode(code)) {
      return yield* Effect.fail(
        new Error(`Access code ${code} is malformed — codes are 8 characters (Crockford base32, hyphen optional).`),
      );
    }

    const hub = yield* hubClient;
    const accessCode = normalizeAccessCode(code);
    const { valid } = yield* Effect.tryPromise({
      try: () => hub.validateInvitationCode(DxContext.default(), { code: accessCode }),
      catch: (cause) =>
        new Error(`Could not validate the access code: ${cause instanceof Error ? cause.message : String(cause)}`),
    });
    if (!valid) {
      return yield* Effect.fail(
        new Error(`Access code ${code} is not valid — it may be unknown, revoked, or already redeemed.`),
      );
    }

    const resolvedMethod: SignupMethod = Option.isSome(method)
      ? method.value
      : yield* Prompt.select({ message: 'Choose a sign-up method:', choices: METHOD_CHOICES }).pipe(Prompt.run);

    const resolvedInput = Option.isSome(input)
      ? input.value
      : yield* Prompt.text({ message: `${INPUT_PROMPT[resolvedMethod]}:` }).pipe(Prompt.run);

    const result = yield* Match.value(resolvedMethod).pipe(
      Match.when('email', () => signUpWithEmail({ client, hub, invoke, code: accessCode, email: resolvedInput })),
      Match.when(ATMOSPHERE_METHOD, () =>
        signUpWithAtmosphere({ client, hub, invoke, code: accessCode, handle: resolvedInput }),
      ),
      Match.exhaustive,
    );

    // Provisions the EDGE agent, as the gate does once the Account exists.
    yield* invoke(ClientOperation.CreateAgent);

    const identity = client.halo.identity.get();
    invariant(identity, 'identity should exist after signup');
    if (json) {
      yield* Console.log(
        JSON.stringify({ ...result, identityDid: identity.did, displayName: identity.profile?.displayName }, null, 2),
      );
    } else {
      yield* Console.log('Signed up successfully');
      yield* Console.log(print(printAccount({ ...result, identityDid: identity.did })));
    }
  }),
).pipe(
  Command.withDescription('Sign up for a new DXOS account with an access code (same methods as Composer).'),
  // The Atmosphere method writes the connected account's credential to the personal space.
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken, Connection.Connection)),
);

const printAccount = (account: SignupResult & { identityDid: string }) =>
  FormBuilder.make({ title: 'Account' }).pipe(
    FormBuilder.set('accountId', account.accountId),
    FormBuilder.set('email', account.email),
    FormBuilder.set('emailVerificationSent', String(account.emailVerificationSent)),
    FormBuilder.set('identityDid', account.identityDid),
    FormBuilder.build,
  );

type MethodParams = {
  client: Client;
  hub: HubHttpClient;
  invoke: Capabilities.OperationInvoker['invoke'];
  code: string;
};

/**
 * Email sign-up, mirroring the gate's sign-up tab (`WelcomeScreen.handleCreateAccount`): bind a
 * local identity to the access code plus the address the user wants to register with. Hub-service
 * mails the verification link out-of-band; the identity is admitted immediately either way.
 */
const signUpWithEmail = Effect.fn(function* ({ client, hub, invoke, code, email }: MethodParams & { email: string }) {
  const identity = yield* ensureIdentity(client, invoke, email.split('@')[0]);
  return yield* redeemAccessCode(hub, { code, email, identity });
});

/**
 * Atmosphere (atproto / Bluesky) OAuth sign-up, mirroring the gate's OAuth-first ordering
 * (`WelcomeScreen.handleCreateAccountWithOAuth` plus the redirect finalizer): authenticate with the
 * provider before creating anything locally, register the provider as a recovery method, then redeem
 * the access code with the provider-verified email.
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

  // OAuth-first: the local identity is created only once the provider has authenticated the user, so
  // a failed or abandoned auth leaves nothing behind.
  const identity = yield* ensureIdentity(client, invoke);
  const space = AppSpace.getPersonalSpace(client);
  invariant(space, 'Personal space not found.');
  yield* Effect.promise(() => space.waitUntilReady());

  const registration = yield* Effect.tryPromise({
    try: () =>
      client.edge.http.completeOAuthRegistration(DxContext.default(), {
        registrationToken,
        identityKey: identity.identityKey.toHex(),
        spaceKey: space.key.toHex(),
      }),
    catch: (cause) =>
      new Error(
        `OAuth registration completion failed: ${cause instanceof Error ? cause.message : String(cause)}. ` +
          'A local identity was created and remains bound to this profile; run `dx account logout` to clear ' +
          'it before retrying.',
      ),
  });
  // The verified email is re-derived server-side from the registrationToken — it is never carried in
  // the redirect. kms-service rejects no-email flows before issuing a token, so this cannot fire.
  invariant(registration.email, 'email missing from completeOAuthRegistration');

  // Materialize the AccessToken keyed by the returned id so rotated tokens land on it; without it the
  // refresh token Edge stored is treated as orphaned and dropped.
  const accessToken = space.db.add(
    AccessToken.make({
      id: registration.accessTokenId,
      source: Atmosphere.SOURCE,
      account: registration.identifier,
      token: registration.accessToken,
      scopes: registration.scopes,
    }),
  );
  // Wrap it in a Connection so the connected account surfaces as a first-class object, as the gate
  // does. Registration completes exactly once, so no de-dup query is needed.
  space.db.add(
    Connection.make({
      name: registration.email,
      connectorId: Atmosphere.PROVIDER_ID,
      accessToken: Ref.make(accessToken),
    }),
  );
  yield* flushAndSync({ indexes: true }).pipe(Effect.provide(spaceLayer(Option.some(space.id))));

  return yield* redeemAccessCode(hub, { code, email: registration.email, identity });
});

/** Create the local identity unless this profile already has one. */
const ensureIdentity = Effect.fn(function* (
  client: Client,
  invoke: Capabilities.OperationInvoker['invoke'],
  displayName?: string,
) {
  const existing = client.halo.identity.get();
  if (existing) {
    return existing;
  }
  // `CreateIdentity` fires `IdentityCreated`, which is what provisions the personal space.
  yield* invoke(ClientOperation.CreateIdentity, { displayName });
  const identity = client.halo.identity.get();
  invariant(identity, 'identity should exist after create');
  return identity;
});

/**
 * Redeem the access code against hub-service to mint the Account, binding it to the local identity.
 * Codes are anonymous at issue time, so the address is supplied here: user-entered on the email
 * path, provider-verified on the atproto path.
 */
const redeemAccessCode = Effect.fn(function* (
  hub: HubHttpClient,
  { code, email, identity }: { code: string; email: string; identity: Identity },
) {
  const result = yield* Effect.tryPromise({
    try: () =>
      hub.redeemInvitationCode(DxContext.default(), {
        code,
        email,
        identityDid: identity.did,
        identityKey: identity.identityKey.toHex(),
      }),
    catch: (cause) => redemptionFailed(email, cause instanceof Error ? cause.message : String(cause)),
  });
  if ('needsIdentity' in result) {
    return yield* Effect.fail(redemptionFailed(email, 'hub did not accept this identity'));
  }
  return { email, accountId: result.accountId, emailVerificationSent: result.emailVerificationSent };
});

/**
 * The local identity outlives any failure past its creation, and hub rejects a second redemption of
 * the same code against a different identity, so both failure modes need the same guidance.
 */
const redemptionFailed = (email: string, detail: string) =>
  new Error(
    `Could not redeem the access code for ${email} (${detail}). A local identity may have been created ` +
      'and remains bound to this profile; run `dx account logout` to clear it before retrying.',
  );
