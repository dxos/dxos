//
// Copyright 2025 DXOS.org
//

import { meta } from '#meta';

export const JOIN_DIALOG = `${meta.id}.JoinDialog`;
export const RECOVERY_CODE_DIALOG = `${meta.id}.RecoveryCodeDialog`;
export const RESET_DIALOG = `${meta.id}.ResetDialog`;

/**
 * URL path Edge redirects to after an OAuth-recovery flow (account registration or identity
 * recovery) completes. atproto/bsky nullifies `window.opener`, so these flows can't use the
 * `postMessage` relay — kms-service always finalizes them via a top-level redirect to this path,
 * carrying the opaque `registrationToken` / `recoveryProof` (never the raw OAuth access token).
 * The recovery finalizer reads this path on app boot and completes the flow.
 */
export const OAUTH_RECOVERY_REDIRECT_PATH = '/redirect/oauth-recovery' as const;

const OAUTH_RECOVERY_PENDING_KEY_PREFIX = 'dxos:oauth-recovery-pending:' as const;

/**
 * `localStorage` key for the in-flight OAuth-recovery snapshot, keyed by `accessTokenId`. The
 * register flow persists the invitation code + hub URL here before opening the auth tab, since the
 * post-auth redirect reloads the app in a fresh tab and that React state would otherwise be lost.
 */
export const oauthRecoveryPendingKey = (
  accessTokenId: string,
): `${typeof OAUTH_RECOVERY_PENDING_KEY_PREFIX}${string}` =>
  `${OAUTH_RECOVERY_PENDING_KEY_PREFIX}${accessTokenId}`;

/**
 * Persisted snapshot of an in-flight OAuth-recovery register flow (recovered after the redirect
 * reload). Only the register flow needs a snapshot; recovery carries everything it needs (the
 * one-time `recoveryProof`) in the redirect URL.
 */
export type OAuthRecoveryPendingSnapshot = {
  purpose: 'register';
  /** Invitation code to redeem (with the provider-verified email) once registration completes. */
  code: string;
  /** Hub-service URL the invitation code is redeemed against. */
  hubUrl: string;
};
