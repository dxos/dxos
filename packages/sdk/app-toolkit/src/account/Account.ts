//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { DEFAULT_AUTH_URL, DEFAULT_HUB_URL } from '@dxos/client-protocol';
import { type Identity } from '@dxos/client/halo';
import { getEnvString } from '@dxos/config';
import { Context as DxContext } from '@dxos/context';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { Ref } from '@dxos/echo';
import { HubHttpClient } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import {
  ACCOUNT_ERROR_TYPES,
  type AccountErrorType,
  ATMOSPHERE_SOURCE,
  InvitationCodeSchema,
  OAuthProvider,
} from '@dxos/protocols';

import * as AppSpace from '../echo/AppSpace.ts';

/**
 * Account sign-up and hub-Account flows, shared by every surface that creates accounts —
 * Composer's welcome screen and OAuth redirect finalizer, and the `dx account` CLI commands.
 * The flows live here rather than in a plugin for the same reason as {@link AppSpace.setupIdentitySpaces}:
 * plugin-client (CLI) cannot depend on the plugins that own the UI, and logic split across the two
 * surfaces has already drifted once (the email probe existed only on the web path).
 *
 * Platform-specific concerns stay with the caller: how the OAuth round-trip runs (popup/redirect vs.
 * local callback server), how the identity is created (`ensureIdentity` is injected so the caller's
 * operation invoker fires `IdentityCreated`), and all UI.
 */

//
// Errors
//

/** The address already has a hub Account; sign-up must not create a local identity for it. */
export class EmailAlreadyRegisteredError extends BaseError.extend(
  'EmailAlreadyRegisteredError',
  'Email already has an account.',
) {}

/**
 * The pre-signup probe could not determine whether the address has an Account (rate limit, timeout,
 * transport failure). Not permission to proceed: an identity created against a taken address is
 * stranded, since redemption refuses to bind it.
 */
export class EmailProbeUnavailableError extends BaseError.extend(
  'EmailProbeUnavailableError',
  'Could not check whether the email already has an account.',
) {}

/** Hub-service refused to redeem the access code / mint the Account. */
export class AccountRedemptionError extends BaseError.extend('AccountRedemptionError', 'Account redemption failed.') {}

/** Edge refused to complete OAuth recovery registration. */
export class OAuthRegistrationError extends BaseError.extend(
  'OAuthRegistrationError',
  'OAuth registration completion failed.',
) {}

/**
 * The hub `AccountErrorType` discriminator carried by a failed call, when the failure was a known
 * account error rather than a transport problem. Read from the error's own context or its cause
 * chain (hub failures surface as `EdgeCallFailedError` with the envelope's `data.type`).
 */
export const accountErrorType = (error: unknown): AccountErrorType | undefined => {
  // Wrapped errors can produce cyclic cause chains, so track what has been seen.
  const seen = new Set<unknown>();
  for (
    let current: unknown = error;
    typeof current === 'object' && current !== null && !seen.has(current);
    current = (current as Error).cause
  ) {
    seen.add(current);
    const data = (current as { data?: unknown; context?: unknown }).data ?? (current as { context?: unknown }).context;
    if (typeof data === 'object' && data !== null && 'type' in data && typeof data.type === 'string') {
      // Only a known discriminator counts — an unrelated `type` field on an intermediate error must
      // not resolve as an account error.
      const match = ACCOUNT_ERROR_TYPES.find((type) => type === data.type);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
};

//
// Hub client
//

/**
 * Hub-service base URL from the client config. `runtime.app.env.DX_HUB_URL` is set by the bundler
 * config plugin from the build's environment, so surfaces without a bundler (the CLI) fall back to
 * `runtime.services.hub.url` — the key the `dx hub` admin commands already read — and finally to
 * {@link DEFAULT_HUB_URL}, so no surface can be left with no hub to talk to.
 *
 * NOTE: The gates that treat the presence of `DX_HUB_URL` as "this is a gated deployment" read the
 * raw config path rather than this resolver, since a default would silently arm them.
 */
export const getHubUrl = (client: Pick<Client, 'config'>): string =>
  getEnvString(client.config, 'DX_HUB_URL') ?? client.config.values?.runtime?.services?.hub?.url ?? DEFAULT_HUB_URL;

/** Origin to send a browser to for a passkey prompt. */
export const getAuthUrl = (client: Pick<Client, 'config'>): string =>
  getEnvString(client.config, 'DX_AUTH_URL') ??
  client.config.values?.runtime?.services?.hub?.authUrl ??
  DEFAULT_AUTH_URL;

/** Client for the configured hub-service (accounts, invitations, email verification). */
export const createHubClient = (clientOrUrl: Client | string): HubHttpClient =>
  new HubHttpClient(typeof clientOrUrl === 'string' ? clientOrUrl : getHubUrl(clientOrUrl));

//
// Access codes
//

/** Hub-service matches the canonical form only ({@link InvitationCodeSchema}): no hyphens, upper case. */
export const normalizeAccessCode = (code: string): string => code.trim().replace(/-/g, '').toUpperCase();

const isCanonicalAccessCode = Schema.is(InvitationCodeSchema);

/** Whether user input normalizes to a well-formed access code — hyphens and case are forgiven. */
export const isValidAccessCodeFormat = (code: string): boolean => isCanonicalAccessCode(normalizeAccessCode(code));

/** Validate an access code against hub-service. Resolves false on any failure — never throws. */
export const checkAccessCode = Effect.fn(function* ({ hub, code }: { hub: HubHttpClient; code: string }) {
  return yield* Effect.tryPromise(() =>
    hub.validateInvitationCode(DxContext.default(), { code: normalizeAccessCode(code) }),
  ).pipe(
    Effect.map(({ valid }) => valid),
    Effect.catch(() => Effect.succeed(false)),
  );
});

//
// Email probe
//

/**
 * Outcome of the pre-signup email probe. `unavailable` is deliberately distinct from `available`:
 * a failed probe says nothing about the address.
 */
export type EmailProbeResult = 'exists' | 'available' | 'unavailable';

/** Bounds the probe so an unresponsive hub cannot leave the signup flow pending. */
const EMAIL_PROBE_TIMEOUT_MS = 10_000;

/** Probe whether an address already has an Account. Failures resolve to `unavailable` — never throws. */
export const probeEmail = Effect.fn(function* ({ hub, email }: { hub: HubHttpClient; email: string }) {
  return yield* Effect.tryPromise(() => hub.checkEmailExists(DxContext.default(), { email })).pipe(
    Effect.timeoutOrElse({
      duration: Duration.millis(EMAIL_PROBE_TIMEOUT_MS),
      orElse: () => Effect.fail(new EmailProbeUnavailableError({ message: 'Email probe timed out.' })),
    }),
    Effect.map(({ exists }): EmailProbeResult => (exists ? 'exists' : 'available')),
    Effect.catch(() => Effect.succeed('unavailable' as const)),
  );
});

//
// Redemption
//

/** A minted hub Account. */
export type SignUpResult = {
  /** Address bound to the Account: user-supplied (email) or provider-verified (OAuth). */
  email: string;
  accountId: string;
  emailVerificationSent: boolean;
};

/**
 * Redeem an access code against hub-service to mint the Account, binding it to the local identity.
 * Codes are anonymous at issue time, so the address is supplied here: user-entered on the email
 * path, provider-verified on the OAuth path.
 */
export const redeemAccessCode = Effect.fn(function* ({
  hub,
  identity,
  email,
  code,
}: {
  hub: HubHttpClient;
  identity: Identity;
  email: string;
  /** Access code; omitted only for addresses the hub exempts from its gate. */
  code?: string;
}) {
  const result = yield* Effect.tryPromise({
    try: async () =>
      hub.redeemInvitationCode(DxContext.default(), {
        code: code === undefined ? undefined : normalizeAccessCode(code),
        email,
        identityDid: await createDidFromIdentityKey(identity.identityKey),
        identityKey: identity.identityKey.toHex(),
      }),
    catch: AccountRedemptionError.wrap(),
  });
  if ('needsIdentity' in result) {
    return yield* Effect.fail(new AccountRedemptionError({ message: 'Hub did not accept this identity.' }));
  }
  log.info('account redeemed', { accountId: result.accountId });
  return { email, accountId: result.accountId, emailVerificationSent: result.emailVerificationSent };
});

/**
 * Email sign-up: probe that the address is free, create the local identity, then redeem the access
 * code. Probing comes first because redemption rejects a taken address and an identity created
 * before that rejection is stranded — it cannot be bound to any account.
 *
 * `ensureIdentity` is injected so the caller's operation invoker creates the identity (firing
 * `IdentityCreated`, which provisions the identity's spaces).
 */
export const signUpWithEmail = Effect.fn(function* <E>({
  hub,
  email,
  code,
  ensureIdentity,
}: {
  hub: HubHttpClient;
  email: string;
  code?: string;
  ensureIdentity: Effect.Effect<Identity, E>;
}) {
  const probe = yield* probeEmail({ hub, email });
  if (probe === 'exists') {
    return yield* Effect.fail(new EmailAlreadyRegisteredError());
  }
  if (probe === 'unavailable') {
    return yield* Effect.fail(new EmailProbeUnavailableError());
  }

  const identity = yield* ensureIdentity;
  return yield* redeemAccessCode({ hub, identity, email, code });
});

//
// OAuth registration
//

export type CompleteOAuthRegistrationResult = {
  /** Provider-verified address; used to redeem the access code. */
  email: string;
  /** Provider account identifier (e.g. atproto handle). */
  identifier: string;
  accessTokenId: string;
};

/**
 * Complete OAuth recovery registration for the local identity: submit the registration token plus
 * the identity and space keys to Edge (which routes the OAuth refresh token into the default space
 * and records the recovery binding), then materialize the credential in the default space — an
 * `AccessToken` keyed by the returned id so rotated tokens land on it (an unkeyed refresh token is
 * treated as orphaned and dropped), wrapped in a `Connection` so the connected account surfaces as
 * a first-class object. Registration completes exactly once per account, so the pair is created
 * unconditionally with no de-dup query.
 */
export const completeOAuthRegistration = Effect.fn(function* ({
  client,
  registrationToken,
}: {
  client: Client;
  registrationToken: string;
}) {
  const identity = client.halo.identity.get();
  invariant(identity, 'Cannot complete OAuth registration without a local identity.');

  const defaultSpace = AppSpace.getDefaultSpace(client);
  invariant(defaultSpace, 'Default space not found.');
  yield* Effect.promise(() => defaultSpace.waitUntilReady());

  const result = yield* Effect.tryPromise({
    try: () =>
      client.edge.http.completeOAuthRegistration(DxContext.default(), {
        registrationToken,
        identityKey: identity.identityKey.toHex(),
        spaceKey: defaultSpace.key.toHex(),
      }),
    catch: OAuthRegistrationError.wrap(),
  });
  // The verified email is re-derived server-side from the registrationToken — it is never carried
  // in a redirect. kms-service rejects no-email flows before issuing a token, so this cannot fire.
  invariant(result.email, 'email missing from completeOAuthRegistration');

  // OAuth registration is atproto-only; the credential belongs to the Atmosphere connector.
  const accessToken = defaultSpace.db.add(
    AccessToken.make({
      id: result.accessTokenId,
      source: ATMOSPHERE_SOURCE,
      account: result.identifier,
      token: result.accessToken,
      scopes: result.scopes,
    }),
  );
  defaultSpace.db.add(
    Connection.make({
      name: result.email,
      connectorId: OAuthProvider.ATPROTO,
      accessToken: Ref.make(accessToken),
    }),
  );
  log.info('OAuth registration completed', { accessTokenId: result.accessTokenId, account: result.identifier });

  return { email: result.email, identifier: result.identifier, accessTokenId: result.accessTokenId };
});
