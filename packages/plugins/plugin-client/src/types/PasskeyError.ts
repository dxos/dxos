//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

/**
 * The platform prompt produced no assertion. WebAuthn reports a dismissed prompt and
 * "this device has no passkey for this site" identically, so the two cannot be told apart.
 */
export class Dismissed extends BaseError.extend('PasskeyDismissedError', 'No passkey was presented') {}

/** The assertion was refused: the passkey is not registered as a recovery credential for any identity. */
export class Rejected extends BaseError.extend('PasskeyRejectedError', 'Passkey was not accepted') {}

/** Passkey login failed before an assertion could be checked (service unreachable, unusable authenticator response). */
export class LoginFailed extends BaseError.extend('PasskeyLoginError', 'Passkey login failed') {}

/** Every way a passkey login can fail, as `ConfigError.ConfigError` names its own union. */
export type PasskeyError = Dismissed | Rejected | LoginFailed;

/** Discriminates a passkey login failure so callers can pick a message without matching on error names. */
export type Failure = 'dismissed' | 'rejected' | 'failed';

/**
 * Classify a rejection from the authenticator. WebAuthn reports a dismissed prompt and
 * "no credential for this site" as the same `NotAllowedError`, so both map to dismissal;
 * the native (Tauri) bridge rejects with a plain string rather than a `DOMException`.
 */
export const fromAssertion = (error: unknown): Dismissed | LoginFailed => {
  const name = error instanceof DOMException ? error.name : undefined;
  if (name === 'NotAllowedError' || name === 'AbortError' || /cancell?ed/i.test(String(error))) {
    return new Dismissed({ cause: error });
  }
  return new LoginFailed({ cause: error });
};

/**
 * Classify an error returned by the `RedeemPasskey` operation.
 * Anything unrecognized is reported as a generic failure rather than swallowed.
 */
export const classify = (error: unknown): Failure => {
  if (Dismissed.is(error)) {
    return 'dismissed';
  }
  if (Rejected.is(error)) {
    return 'rejected';
  }
  return 'failed';
};
