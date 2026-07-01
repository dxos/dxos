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

import { CommandConfig, performRecoveryOAuthFlow, print } from '@dxos/cli-util';
import { type Client, ClientService } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { Context as DxContext } from '@dxos/context';
import { HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { ATPROTO_OAUTH_SCOPES, OAuthProvider } from '@dxos/protocols';

import { printIdentity, waitForState } from '../../halo/util';

type LoginMethod = 'email' | 'atproto' | 'device-invitation' | 'recovery-code';

const LOGIN_METHODS: LoginMethod[] = ['email', 'atproto', 'device-invitation', 'recovery-code'];

const METHOD_CHOICES = [
  { title: 'Email', value: 'email' as const },
  { title: 'AT Protocol', value: 'atproto' as const },
  { title: 'Device invitation', value: 'device-invitation' as const },
  { title: 'Recovery code', value: 'recovery-code' as const },
];

const INPUT_PROMPT: Record<LoginMethod, string> = {
  'email': 'Email address',
  'atproto': 'atproto handle or DID (e.g. alice.bsky.social)',
  'device-invitation': 'Invitation code or URL',
  'recovery-code': 'Recovery code (seed phrase)',
};

export const login = Command.make(
  'login',
  {
    method: Options.choice('method', LOGIN_METHODS).pipe(
      Options.withDescription(
        'Login method (email | atproto | device-invitation | recovery-code). Prompted if omitted.',
      ),
      Options.optional,
    ),
    input: Args.text({ name: 'input' }).pipe(
      Args.withDescription('Method input: email address / atproto handle / invitation code / recovery code.'),
      Args.optional,
    ),
  },
  Effect.fn(function* ({ method, input }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    // TODO(wittjosiah): How to surface this error to the user cleanly?
    invariant(!client.halo.identity.get(), 'Already logged in. Run `dx account logout` first.');

    const resolvedMethod: LoginMethod = Option.isSome(method)
      ? method.value
      : yield* Prompt.select({ message: 'Choose a login method:', choices: METHOD_CHOICES }).pipe(Prompt.run);

    const resolvedInput = Option.isSome(input)
      ? input.value
      : yield* Prompt.text({ message: `${INPUT_PROMPT[resolvedMethod]}:` }).pipe(Prompt.run);

    const identity = yield* Match.value(resolvedMethod).pipe(
      Match.when('atproto', () => loginWithAtproto(client, resolvedInput)),
      Match.when('email', () => loginWithEmail(client, resolvedInput)),
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
 * atproto / Bluesky OAuth login: runs the gate recovery flow (local server + browser) and redeems
 * the resulting one-time `recoveryProof` to admit this device into the existing identity's HALO.
 */
const loginWithAtproto = (client: Client, handle: string) =>
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
 * Email login: hub-service inlines a one-time `token` for test emails and emails it out-of-band
 * otherwise. Redeems the token to admit this device into HALO.
 */
const loginWithEmail = (client: Client, email: string) =>
  Effect.gen(function* () {
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    invariant(hubUrl, 'Hub URL not configured (runtime.app.env.DX_HUB_URL).');
    const hub = new HubHttpClient(hubUrl);
    const { token: inlineToken } = yield* Effect.tryPromise(() => hub.login(DxContext.default(), { email }));
    let token = inlineToken;
    if (!token) {
      yield* Console.log(`A login link was sent to ${email}. Paste the token from the email below.`);
      token = yield* Prompt.text({ message: 'Login token' }).pipe(Prompt.run);
    }
    return yield* Effect.tryPromise(() => client.halo.recoverIdentity({ token }));
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
    yield* waitForState(invitation, Invitation.State.READY_FOR_AUTHENTICATION);
    const authCode = yield* Prompt.text({ message: 'Enter the authentication code' }).pipe(Prompt.run);
    yield* Effect.tryPromise(() => invitation.authenticate(authCode));
    yield* waitForState(invitation, Invitation.State.SUCCESS);
    const identity = client.halo.identity.get();
    invariant(identity, 'Device invitation completed but no identity is present.');
    return identity;
  });
