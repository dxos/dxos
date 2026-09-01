//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Account from '@dxos/app-toolkit/Account';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { ClientOperation } from '@dxos/plugin-client/ClientOperation';

import { OnboardingOperation } from '../operations/index.ts';
import {
  OAUTH_RECOVERY_REDIRECT_PATH,
  type OAuthRecoveryPendingSnapshot,
  oauthRecoveryPendingKey,
} from '../operations/shared.ts';

const RECOVER_IDENTITY_RPC_TIMEOUT = 30_000;

type RedirectParams = {
  accessTokenId?: string;
  registrationToken?: string;
  recoveryProof?: string;
  /** kms-service signals a pre-identity failure here (e.g. `already_registered`) so the client can
   * surface a friendly message and skip identity creation. */
  error?: string;
};

/**
 * Decode the OAuth-recovery redirect params from a callback URL. Yields params only when a
 * `registrationToken` (register flow), `recoveryProof` (recovery flow), or `error` is present.
 */
const parseRedirectParams = (url: URL): RedirectParams | undefined => {
  const accessTokenId = url.searchParams.get('accessTokenId') ?? undefined;
  const registrationToken = url.searchParams.get('registrationToken') ?? undefined;
  const recoveryProof = url.searchParams.get('recoveryProof') ?? undefined;
  const error = url.searchParams.get('error') ?? undefined;
  if (!registrationToken && !recoveryProof && !error) {
    log.warn('oauth recovery redirect: missing registrationToken/recoveryProof/error', { accessTokenId });
    return undefined;
  }
  return { accessTokenId, registrationToken, recoveryProof, error };
};

/**
 * Read and consume the OAuth-recovery redirect params from the current URL.
 *
 * Rewrites the URL to `/` synchronously (regardless of outcome) so the deck doesn't try to resolve
 * `/redirect/oauth-recovery` as a workspace.
 */
const readRedirectParams = (): RedirectParams | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const url = new URL(window.location.href);
  if (url.pathname !== OAUTH_RECOVERY_REDIRECT_PATH) {
    return undefined;
  }
  const params = parseRedirectParams(url);

  // Strip the redirect params regardless, so the deck doesn't interpret the path.
  window.history.replaceState(null, '', '/');

  return params;
};

const readSnapshot = (accessTokenId: string | undefined): OAuthRecoveryPendingSnapshot | undefined => {
  if (!accessTokenId) {
    return undefined;
  }
  const raw = localStorage.getItem(oauthRecoveryPendingKey(accessTokenId));
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as OAuthRecoveryPendingSnapshot;
  } catch (error) {
    log.warn('failed to parse OAuth recovery snapshot', { error });
    return undefined;
  }
};

const deleteSnapshot = (accessTokenId: string | undefined): void => {
  if (accessTokenId) {
    localStorage.removeItem(oauthRecoveryPendingKey(accessTokenId));
  }
};

/**
 * `Effect.tryPromise` wraps a rejected promise in `UnknownError`, whose own `.message` is a
 * generic boilerplate string — the real cause lives in its `.cause` property, so unwrap it before
 * logging or it is silently lost.
 */
const describeError = (error: unknown): string => {
  const cause = Cause.isUnknownError(error) ? error.cause : error;
  return cause instanceof Error ? cause.message : String(cause);
};

/**
 * Complete one captured callback against the running client. The params are in hand before the
 * client is, so this waits for it rather than holding up plugin startup.
 */
const finalize = Effect.fnUntraced(function* (params: RedirectParams) {
  log('oauth recovery redirect: capturing params', {
    accessTokenId: params.accessTokenId,
    flow: params.error ? 'error' : params.registrationToken ? 'register' : 'recovery',
    error: params.error,
  });
  const client = yield* Capability.waitFor(ClientCapabilities.Client);
  const invoker = yield* Capability.waitFor(Capabilities.OperationInvoker);
  // The capability is contributed while the forked initialization is still running;
  // `halo` reads below need it complete.
  yield* Effect.promise(() => client.waitUntilInitialized());
  yield* finalizeRedirect(client, invoker, params).pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        log.error('oauth recovery finalize failed', { error: describeError(error) });
        yield* invoker
          .invoke(LayoutOperation.AddToast, {
            id: 'oauth-recovery-error-unknown',
            title: 'OAuth recovery failed',
            description: 'Something went wrong completing sign-in. Please try again.',
            icon: 'ph--warning-circle--regular',
            duration: 10_000,
          })
          .pipe(Effect.ignore);
      }),
    ),
    Effect.ensuring(Effect.sync(() => deleteSnapshot(params.accessTokenId))),
  );
});

/**
 * Startup module that finalizes redirect-flow OAuth-recovery callbacks.
 *
 * atproto/bsky nullifies `window.opener`, so the register / recovery flows cannot relay their
 * result back via `postMessage`. Instead kms-service redirects to `/redirect/oauth-recovery`: in
 * the browser that reloads the app fresh and the params are read off the location here (rewriting
 * the URL to `/`); on desktop the shell cancels that navigation and relays the URL as an event
 * instead. Either way a daemon fiber waits for the client + operation invoker and completes the
 * flow from the params plus the `localStorage` snapshot the initiating operation persisted:
 *
 * - register: create the local identity (if needed), complete OAuth registration, then redeem the
 *   stashed invitation code with the provider-verified email to mint the hub Account.
 * - recovery: redeem the one-time recovery proof via `IdentityService.recoverIdentity` to admit
 *   this device into HALO.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const params = readRedirectParams();
    if (params) {
      yield* Effect.forkDetach(finalize(params));
    }

    if (NativeOAuth.supportsNativeOAuth()) {
      // The shell cancels the callback navigation rather than booting a second copy of the app in
      // its OAuth window, so on desktop the params arrive as an event instead of a page load.
      yield* Effect.forkDetach(
        NativeOAuth.nativeOAuthCallbacks(OAUTH_RECOVERY_REDIRECT_PATH).pipe(
          Stream.runForEach((url) =>
            Effect.suspend(() => {
              const callbackParams = parseRedirectParams(url);
              return callbackParams ? finalize(callbackParams) : Effect.void;
            }),
          ),
          Effect.catch((error) =>
            Effect.sync(() => log.warn('oauth recovery: native callback stream failed', { error })),
          ),
        ),
      );
    }

    return [];
  }),
);

const finalizeRedirect = Effect.fnUntraced(function* (
  client: Client,
  invoker: Capabilities.OperationInvoker,
  params: RedirectParams,
) {
  const closeDialog = invoker.invoke(LayoutOperation.UpdateDialog, { state: false }).pipe(Effect.ignore);

  // Pre-identity failure from kms-service (e.g. duplicate OAuth registration). Surface a toast and
  // bail BEFORE attempting identity creation, so a re-registration doesn't leave a dangling local
  // identity behind.
  if (params.error) {
    const title =
      params.error === 'already_registered'
        ? 'Already registered'
        : params.error === 'not_registered'
          ? 'Not registered'
          : params.error === 'no_email'
            ? 'Email required'
            : 'OAuth recovery failed';
    const description =
      params.error === 'already_registered'
        ? 'This account is already registered. Please log in instead.'
        : params.error === 'not_registered'
          ? 'This account is not registered for recovery. Please sign up first.'
          : params.error === 'no_email'
            ? 'Your Atmosphere account does not have an email address. Please add one and try signing up again.'
            : `Could not complete OAuth recovery: ${params.error}`;
    log.warn('oauth recovery redirect: kms-service reported error', { error: params.error });
    yield* invoker
      .invoke(LayoutOperation.AddToast, {
        id: `oauth-recovery-error-${params.error}`,
        title,
        description,
        icon: 'ph--warning-circle--regular',
        duration: 10_000,
      })
      .pipe(Effect.ignore);
    return;
  }

  if (params.registrationToken) {
    const snapshot = readSnapshot(params.accessTokenId);
    if (!snapshot || snapshot.purpose !== 'register') {
      log.warn('oauth recovery: no registration snapshot for redirect', { accessTokenId: params.accessTokenId });
      return;
    }

    // Create the local identity now that the user has authenticated (OAuth-first ordering).
    let identity = client.halo.identity.get();
    if (!identity) {
      yield* invoker.invoke(ClientOperation.CreateIdentity, {});
      identity = client.halo.identity.get();
    }
    invariant(identity, 'identity should exist after create');

    // Route the stashed OAuth refresh token to the default space + write the IdentityRecovery row.
    const completeResult = yield* invoker.invoke(OnboardingOperation.CompleteOAuthRegistration, {
      registrationToken: params.registrationToken,
    });
    // Re-derive the verified email server-side from the registrationToken — it is never carried in
    // the redirect URL. kms-service rejects the flow before issuing a registrationToken when the
    // provider returns no email, so this invariant should never fire in practice.
    const email = completeResult?.email;
    invariant(email, 'email missing from completeRegistration — kms-service should have rejected no-email flows');

    // Redeem the invitation code with the email to mint the hub Account.
    yield* Account.redeemAccessCode({
      hub: Account.createHubClient(snapshot.hubUrl),
      identity,
      email,
      code: snapshot.code,
    });
    yield* invoker.schedule(ClientOperation.CreateAgent);
    yield* closeDialog;
    return;
  }

  if (params.recoveryProof) {
    const identityService = client.services.services.IdentityService;
    invariant(identityService, 'IdentityService not available');
    const recoveryProof = params.recoveryProof;
    yield* Effect.tryPromise(() =>
      identityService.recoverIdentity({ recoveryProof }, { timeout: RECOVER_IDENTITY_RPC_TIMEOUT }),
    );
    yield* invoker.schedule(ClientOperation.CreateAgent);
    yield* closeDialog;
  }
});
