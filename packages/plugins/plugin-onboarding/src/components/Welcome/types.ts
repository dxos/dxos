//
// Copyright 2024 DXOS.org
//

import type { Identity } from '@dxos/client/halo';
import { type PasskeyFailure } from '@dxos/plugin-client';
import { type MaybePromise } from '@dxos/util';

/**
 * Which failure the screen is currently reporting. Only one login method is on screen at a time, so
 * one field is enough; the reason selects both the message and the control it renders under.
 */
export type WelcomeError = 'email' | 'oauth' | `passkey-${PasskeyFailure}`;

export const passkeyError = (failure: PasskeyFailure): WelcomeError => `passkey-${failure}`;

export enum WelcomeState {
  INIT = 0,
  // TODO(wittjosiah): Remove this state once signups are auto-admitted.
  EMAIL_SENT = 1,
  LOGIN_SENT = 2,
  WAITLIST_SUBMITTED = 4,
}

export type WelcomeScreenProps = {
  state: WelcomeState;
  identity?: Identity | null;
  /** Failure from the last login/sign-up attempt; cleared when a new attempt starts. */
  error?: WelcomeError | null;

  // Login tab.
  /** Existing-account email login. Server returns a recovery token inline (dev)
   * or emails it (prod); response is identical for unknown emails. */
  onEmailLogin?: (email: string) => MaybePromise<void>;
  onPasskey?: () => MaybePromise<void>;
  onJoinIdentity?: () => MaybePromise<void>;
  onRecoverIdentity?: () => MaybePromise<void>;
  /**
   * Recover an existing identity via an OAuth provider (e.g. Atmosphere/atproto). `loginHint` is the
   * provider login hint (atproto handle or DID); required for atproto so Edge can resolve the PDS.
   */
  onRecoverWithOAuth?: (provider: string, loginHint?: string) => MaybePromise<void>;

  // Sign-up tab.
  /** Validate an invitation code before showing the auth step. Resolves true if valid. */
  onValidateInvitationCode?: (code: string) => MaybePromise<boolean>;
  /** Redeem an invitation code with email -> creates Account + identity. */
  onCreateAccount?: (args: { code: string; email: string }) => MaybePromise<void>;
  /**
   * Create an account via an OAuth provider (e.g. Atmosphere/atproto): creates a local identity,
   * registers the provider as a recovery method, and redeems the invitation code with the
   * provider-verified email.
   */
  onCreateAccountWithOAuth?: (args: { code: string; provider: string; loginHint?: string }) => MaybePromise<void>;
  /** Submit waitlist sign-up (no invitation code). */
  onJoinWaitlist?: (email: string) => MaybePromise<void>;
};

export const validEmail = (email: string) => !!email.match(/.+@.+\..+/);

/** Crockford base32 (no I/L/O/U), 8 chars, case-insensitive, optional hyphen. */
export const validInvitationCode = (code: string) =>
  /^[0-9A-HJ-KM-NP-TV-Z]{4}-?[0-9A-HJ-KM-NP-TV-Z]{4}$/i.test(code.trim());
