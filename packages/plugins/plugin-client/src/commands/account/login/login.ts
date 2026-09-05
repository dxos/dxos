//
// Copyright 2026 DXOS.org
//

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
import { CommandConfig, openBrowser, print } from '@dxos/cli-util';
import { type LocalCallbackServer, startLocalCallbackServer } from '@dxos/cli-util/callback';
import { performRecoveryOAuthFlow } from '@dxos/cli-util/oauth';
import { type Client, ClientService } from '@dxos/client';
import { Invitation_State, InvitationEncoder } from '@dxos/client/invitations';
import { Context as DxContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { ATPROTO_OAUTH_SCOPES, OAuthProvider } from '@dxos/protocols';

import { ClientOperation } from '#operations';

import { printIdentity, waitForState } from '../../halo/util';
import {
  ATMOSPHERE_INPUT_PROMPT,
  ATMOSPHERE_METHOD,
  ATMOSPHERE_METHOD_TITLE,
  METHOD_ALIASES,
  hubClient,
  methodOption,
} from '../util';

type LoginMethod = 'email' | 'passkey' | typeof ATMOSPHERE_METHOD | 'device-invitation' | 'recovery-code';

const LOGIN_METHODS: LoginMethod[] = ['email', 'passkey', ATMOSPHERE_METHOD, 'device-invitation', 'recovery-code'];

const METHOD_CHOICES = [
  { title: 'Email', value: 'email' as const },
  { title: 'Passkey', value: 'passkey' as const },
  { title: ATMOSPHERE_METHOD_TITLE, value: ATMOSPHERE_METHOD },
  { title: 'Device invitation', value: 'device-invitation' as const },
  { title: 'Recovery code', value: 'recovery-code' as const },
];

/** Absent for `passkey`, which identifies the holder from the credential rather than from input. */
const INPUT_PROMPT: Partial<Record<LoginMethod, string>> = {
  'email': 'Email address',
  [ATMOSPHERE_METHOD]: ATMOSPHERE_INPUT_PROMPT,
  'device-invitation': 'Invitation code or URL',
  'recovery-code': 'Recovery code (seed phrase)',
};

export const login = Command.make(
  'login',
  {
    method: methodOption(LOGIN_METHODS, METHOD_ALIASES).pipe(
      Options.withDescription(
        'Login method (email | passkey | atmosphere | device-invitation | recovery-code). Prompted if omitted.',
      ),
      Options.optional,
    ),
    input: Args.string('input').pipe(
      Args.withDescription(
        'Method input: email address / Atmosphere handle / invitation code / recovery code. Unused by passkey.',
      ),
      Args.optional,
    ),
  },
  Effect.fn(function* ({ method, input }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const manager = yield* Plugin.Service;
    const { invoke } = manager.capabilities.get(Capabilities.OperationInvoker);
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Already logged in. Run `dx account logout` first.');

    const resolvedMethod: LoginMethod = Option.isSome(method)
      ? method.value
      : yield* Prompt.select({ message: 'Choose a login method:', choices: METHOD_CHOICES }).pipe(Prompt.run);

    const inputPrompt = INPUT_PROMPT[resolvedMethod];
    const resolvedInput = Option.isSome(input)
      ? input.value
      : inputPrompt
        ? yield* Prompt.text({ message: `${inputPrompt}:` }).pipe(Prompt.run)
        : '';

    const identity = yield* Match.value(resolvedMethod).pipe(
      Match.when(ATMOSPHERE_METHOD, () => loginWithAtmosphere(client, resolvedInput)),
      Match.when('email', () => loginWithEmail(client, resolvedInput, invoke)),
      Match.when('passkey', () => loginWithPasskey(client)),
      Match.when('recovery-code', () => loginWithRecoveryCode(client, resolvedInput)),
      Match.when('device-invitation', () => loginWithDeviceInvitation(client, resolvedInput)),
      Match.exhaustive,
    );

    if (json) {
      yield* Console.log(
        JSON.stringify({ identityDid: identity.did, displayName: identity.profile?.displayName }, null, 2),
      );
    } else {
      yield* Console.log('Logged in successfully');
      yield* Console.log(print(printIdentity({ identityDid: identity.did, profile: identity.profile })));
    }
  }),
).pipe(Command.withDescription('Log in to an existing DXOS identity (same methods as Composer).'));

/**
 * Atmosphere (atproto / Bluesky) OAuth login: runs the gate recovery flow (local server + browser)
 * and redeems the resulting one-time `recoveryProof` to admit this device into the existing
 * identity's HALO.
 */
const loginWithAtmosphere = (client: Client, handle: string) =>
  Effect.gen(function* () {
    const edgeBaseUrl = client.config.values.runtime?.services?.edge?.url;
    invariant(edgeBaseUrl, 'Edge services not configured (runtime.services.edge.url).');
    const { recoveryProof } = yield* performRecoveryOAuthFlow({
      edgeBaseUrl,
      provider: OAuthProvider.ATPROTO,
      scopes: ATPROTO_OAUTH_SCOPES,
      loginHint: handle,
    });
    return yield* Effect.tryPromise(() => client.halo.recoverIdentity({ recoveryProof }));
  });

/** Recovery-code (seed phrase) login. */
const loginWithRecoveryCode = (client: Client, recoveryCode: string) =>
  Effect.tryPromise(() => client.halo.recoverIdentity({ recoveryCode }));

/**
 * Path the hub's sign-in page hands the login token back on: it navigates to the root of the
 * callback origin with the token in the query string.
 */
const PASSKEY_CALLBACK_PATH = '/';

/**
 * Passkey login, with the prompt running on a hub-served page rather than here.
 *
 * A CLI cannot run it itself: WebAuthn scopes a credential to a relying party, and a page served
 * from a loopback port can only ever name `localhost`, so a `composer.space` passkey is never
 * offered to one. The hub verifies the assertion and mints the same login token the emailed link
 * mints, which is why this ends in the same `recoverIdentity({ token })` call the email method
 * makes. Nothing about the passkey reaches this process.
 *
 * What stops a link to this page from authorizing someone else's terminal is the callback rule: the
 * hub only ever sends the token to a loopback origin, so a stranger who phishes an approval has it
 * delivered to the victim's own machine, where nothing of theirs is listening.
 */
const loginWithPasskey = (client: Client) =>
  Effect.gen(function* () {
    const server = yield* startLocalCallbackServer(PASSKEY_CALLBACK_PATH, {
      successMessage: 'Signed in. You can close this window and return to your terminal.',
    });

    return yield* Effect.gen(function* () {
      const url = new URL('/auth/verify', Account.getAuthUrl(client));
      url.searchParams.set('purpose', 'device');
      url.searchParams.set('callback', server.origin);

      yield* openBrowser(url.href).pipe(
        Effect.catch(() => Console.log(`Could not open a browser. Open this on this machine:\n\n  ${url.href}\n`)),
      );
      yield* Console.log('Waiting for you to approve the sign-in in your browser...');

      const { token } = yield* server.waitForResult();
      if (!token) {
        return yield* Effect.fail(new Error('The sign-in completed without returning a token.'));
      }

      return yield* Effect.tryPromise({
        try: () => client.halo.recoverIdentity({ token }),
        catch: (cause) =>
          new Error(
            `Passkey login failed (${cause instanceof Error ? cause.message : String(cause)}). ` +
              'EDGE admits a passkey only when it is registered as a recovery credential; add one from Composer ' +
              'before logging in here.',
          ),
      });
    }).pipe(Effect.ensuring(server.stop()));
  });

/**
 * Path the emailed link lands on. The hub's activation route rewrites its redirect to the root of
 * the redirect origin, so the local server has to answer there.
 */
const LOGIN_CALLBACK_PATH = '/';

/** Matches the hub's login-token TTL. There is nothing left to wait for once the token expires. */
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Resolves when the browser lands on the local callback server after the emailed link is clicked.
 * The link only ever redirects to this machine's loopback origin, so that is the one place a token
 * can arrive.
 */
const awaitLoginToken = (server: LocalCallbackServer) =>
  server
    .waitForResult(LOGIN_TIMEOUT_MS)
    .pipe(
      Effect.flatMap(({ token }) =>
        token ? Effect.succeed(token) : Effect.fail(new Error('The login link carried no token.')),
      ),
    );

/**
 * Email login, mirroring the gate's login tab (`WelcomeScreen.handleLogin`). Hub-service answers in
 * one of two ways:
 *
 * - `needsIdentity`: the address may bind a fresh Account but has no identity yet. Create one
 *   locally and retry with its DID; the hub then admits it directly — there is no token because
 *   there is nothing to recover — and we provision the agent as the gate does.
 * - otherwise: the link went out by email (a token is never returned inline). Clicking it finishes
 *   the login here, because the hub redirects the browser to the local callback server rather than
 *   to the web app.
 */
const loginWithEmail = (client: Client, email: string, invoke: Capabilities.OperationInvoker['invoke']) =>
  Effect.gen(function* () {
    const hub = yield* hubClient;
    // The redirect target is named on the call that mints the token, so the server starts before
    // the hub says whether an email is sent at all. A bind failure is swallowed rather than raised
    // here because the `needsIdentity` path below completes without a callback.
    const server = yield* startLocalCallbackServer(LOGIN_CALLBACK_PATH, {
      successMessage: 'Logged in. You can close this window and return to the terminal.',
    }).pipe(Effect.option, Effect.map(Option.getOrUndefined));

    return yield* Effect.gen(function* () {
      const result = yield* Effect.tryPromise(() =>
        hub.login(DxContext.default(), { email, redirectUrl: server?.origin }),
      );

      if (result.needsIdentity) {
        // `CreateIdentity` fires `IdentityCreated`, which is what provisions the identity's spaces.
        yield* invoke(ClientOperation.CreateIdentity, { displayName: email.split('@')[0] });
        const identity = client.halo.identity.get();
        invariant(identity, 'identity should exist after create');
        // The local identity outlives any failure from here on, and the `Already logged in` guard
        // above rejects a plain retry, so every failure below carries the same recovery step.
        const recovery =
          'A local identity was created and remains bound to this profile; run `dx account logout` ' +
          'to clear it before retrying.';

        const retry = yield* Effect.tryPromise({
          try: () =>
            hub.login(DxContext.default(), {
              email,
              identityDid: identity.did,
              identityKey: identity.identityKey.toHex(),
            }),
          catch: (cause) =>
            new Error(
              `Login request for ${email} failed (${cause instanceof Error ? cause.message : String(cause)}). ${recovery}`,
            ),
        });
        if (!retry.admitted) {
          return yield* Effect.fail(
            new Error(
              `Hub did not admit ${email}. A gated hub only admits addresses with an account — ` +
                'run `dx account signup <ACCESS-CODE>` to create one. ' +
                recovery,
            ),
          );
        }
        yield* invoke(ClientOperation.CreateAgent);
        return identity;
      }

      yield* Console.log(`A login link was sent to ${email}.`);
      // Only reachable when the port bind failed above: the hub then minted a token with no
      // redirect, so the link lands on the web app and this command has nothing to wait for.
      if (!server) {
        return yield* Effect.fail(
          new Error(
            'Could not open a local callback server, so the emailed link has nowhere to return to. ' +
              'Free a loopback port and run the command again.',
          ),
        );
      }
      yield* Console.log('Open it on this machine to finish signing in.');
      const token = yield* awaitLoginToken(server);
      return yield* Effect.tryPromise(() => client.halo.recoverIdentity({ token }));
    }).pipe(Effect.ensuring(server?.stop() ?? Effect.void));
  });

/**
 * Device-invitation login: joins an existing identity from another authorized device.
 *
 * NOTE: p2p networking does not work in bun — this method will likely hang waiting for the peer.
 */
const loginWithDeviceInvitation = (client: Client, encoded: string) =>
  Effect.gen(function* () {
    let code = encoded;
    if (code.startsWith('http') || code.startsWith('socket')) {
      code = new URL(code).searchParams.get('deviceInvitationCode') ?? code;
    }
    const invitation = client.halo.join(InvitationEncoder.decode(code));
    yield* waitForState(invitation, Invitation_State.READY_FOR_AUTHENTICATION);
    const authCode = yield* Prompt.text({ message: 'Enter the authentication code' }).pipe(Prompt.run);
    yield* Effect.tryPromise(() => invitation.authenticate(authCode));
    yield* waitForState(invitation, Invitation_State.SUCCESS);
    const identity = client.halo.identity.get();
    invariant(identity, 'Device invitation completed but no identity is present.');
    return identity;
  });
