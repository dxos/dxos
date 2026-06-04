//
// Copyright 2024 DXOS.org
//

import type { Identity } from '@dxos/client/halo';
import { type MaybePromise } from '@dxos/util';

export enum WelcomeState {
  INIT = 0,
  // TODO(wittjosiah): Remove this state once signups are auto-admitted.
  EMAIL_SENT = 1,
  LOGIN_SENT = 2,
  SPACE_INVITATION = 3,
  WAITLIST_SUBMITTED = 4,
}

export type WelcomeScreenProps = {
  state: WelcomeState;
  identity?: Identity | null;
  error?: boolean;

  // Login tab.
  /** Existing-account email login. Server returns a recovery token inline (dev)
   * or emails it (prod); response is identical for unknown emails. */
  onEmailLogin?: (email: string) => MaybePromise<void>;
  onPasskey?: () => MaybePromise<void>;
  onJoinIdentity?: () => MaybePromise<void>;
  onRecoverIdentity?: () => MaybePromise<void>;

  // Sign-up tab.
  /** Validate an invitation code before showing the auth step. Resolves true if valid. */
  onValidateInvitationCode?: (code: string) => MaybePromise<boolean>;
  /** Redeem an invitation code with email -> creates Account + identity. */
  onCreateAccount?: (args: { code: string; email: string }) => MaybePromise<void>;
  /** Submit waitlist sign-up (no invitation code). */
  onJoinWaitlist?: (email: string) => MaybePromise<void>;

  // Other.
  onSpaceInvitation?: () => MaybePromise<void>;
  onGoToLogin?: () => MaybePromise<void>;
};

export const validEmail = (email: string) => !!email.match(/.+@.+\..+/);

/** Crockford base32 (no I/L/O/U), 8 chars, case-insensitive, optional hyphen. */
export const validInvitationCode = (code: string) =>
  /^[0-9A-HJ-KM-NP-TV-Z]{4}-?[0-9A-HJ-KM-NP-TV-Z]{4}$/i.test(code.trim());
