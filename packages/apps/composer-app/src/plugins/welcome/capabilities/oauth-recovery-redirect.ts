//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities, ClientOperation } from '@dxos/plugin-client';

import { redeemAccountInvitation } from '../credentials';
import { WelcomeOperation } from '../operations';
import {
  OAUTH_RECOVERY_REDIRECT_PATH,
  type OAuthRecoveryPendingSnapshot,
  oauthRecoveryPendingKey,
} from '../operations/shared';

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
 * Read and consume the OAuth-recovery redirect params from the current URL.
 *
 * Rewrites the URL to `/` synchronously (regardless of outcome) so the deck doesn't try to resolve
 * `/redirect/oauth-recovery` as a workspace. Returns the params only when a `registrationToken`
 * (register flow) or `recoveryProof` (recovery flow) is present.
 */
const readRedirectParams = (): RedirectParams | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const url = new URL(window.location.href);
  if (url.pathname !== OAUTH_RECOVERY_REDIRECT_PATH) {
    return undefined;
  }
  const accessTokenId = url.searchParams.get('accessTokenId') ?? undefined;
  const registrationToken = url.searchParams.get('registrationToken') ?? undefined;
  const recoveryProof = url.searchParams.get('recoveryProof') ?? undefined;
  const error = url.searchParams.get('error') ?? undefined;

  // Strip the redirect params regardless, so the deck doesn't interpret the path.
  window.history.replaceState(null, '', '/');

  if (!registrationToken && !recoveryProof && !error) {
    log.warn('oauth recovery redirect: missing registrationToken/recoveryProof/error', { accessTokenId });
    return undefined;
  }
  return { accessTokenId, registrationToken, recoveryProof, error };
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
 * Startup module that finalizes redirect-flow OAuth-recovery callbacks.
 *
 * atproto/bsky nullifies `window.opener`, so the register / recovery flows cannot relay their
 * result back via `postMessage`. Instead kms-service redirects the auth tab to
 * `/redirect/oauth-recovery`, reloading the app fresh. This module captures the redirect params
 * synchronously on Startup (rewriting the URL to `/`), then on a daemon fiber waits for the client
 * + operation invoker and completes the flow from the params plus the `localStorage` snapshot the
 * initiating operation persisted:
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
      log('oauth recovery redirect: capturing params', {
        accessTokenId: params.accessTokenId,
        flow: params.error ? 'error' : params.registrationToken ? 'register' : 'recovery',
        error: params.error,
      });
      yield* Effect.forkDaemon(
        Effect.gen(function* () {
          const client = yield* Capability.waitFor(ClientCapabilities.Client);
          const invoker = yield* Capability.waitFor(Capabilities.OperationInvoker);
          yield* finalizeRedirect(client, invoker, params).pipe(
            Effect.catchAll((error) =>
              Effect.sync(() =>
                log.error('oauth recovery finalize failed', {
                  error: error instanceof Error ? error.message : String(error),
                }),
              ),
            ),
            Effect.ensuring(Effect.sync(() => deleteSnapshot(params.accessTokenId))),
          );
        }),
      );
    }
    return Capability.contributes(Capabilities.Null, null);
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
            ? 'Your Bluesky account does not have an email address. Please add one at bsky.app and try signing up again.'
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

    // Route the stashed OAuth refresh token to the personal space + write the IdentityRecovery row.
    const completeResult = yield* invoker.invoke(WelcomeOperation.CompleteOAuthRegistration, {
      registrationToken: params.registrationToken,
    });
    // Re-derive the verified email server-side from the registrationToken — it is never carried in
    // the redirect URL. kms-service rejects the flow before issuing a registrationToken when the
    // provider returns no email, so this invariant should never fire in practice.
    const email = completeResult?.email;
    invariant(email, 'email missing from completeRegistration — kms-service should have rejected no-email flows');

    // Redeem the invitation code with the email to mint the hub Account.
    const identityDid = yield* Effect.tryPromise(() => createDidFromIdentityKey(identity.identityKey));
    const result = yield* Effect.tryPromise(() =>
      redeemAccountInvitation({
        hubUrl: snapshot.hubUrl,
        email,
        identityDid,
        identityKey: identity.identityKey.toHex(),
        code: snapshot.code.replace(/-/g, '').toUpperCase(),
      }),
    );
    if ('accountId' in result) {
      log.info('account created', { accountId: result.accountId });
    }
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
