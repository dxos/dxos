//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * The platform prompt produced no assertion. WebAuthn reports a dismissed prompt and
 * "this device has no passkey for this site" identically, so the two cannot be told apart.
 */
export class PasskeyDismissedError extends BaseError.extend('PasskeyDismissedError', 'No passkey was presented') {}

/** The assertion was refused: the passkey is not registered as a recovery credential for any identity. */
export class PasskeyRejectedError extends BaseError.extend('PasskeyRejectedError', 'Passkey was not accepted') {}

/** Passkey login failed before an assertion could be checked (service unreachable, unusable authenticator response). */
export class PasskeyLoginError extends BaseError.extend('PasskeyLoginError', 'Passkey login failed') {}

/**
 * Classify a rejection from the authenticator. WebAuthn reports a dismissed prompt and
 * "no credential for this site" as the same `NotAllowedError`, so both map to dismissal;
 * the native (Tauri) bridge rejects with a plain string rather than a `DOMException`.
 */
export const toPasskeyAssertionError = (error: unknown): PasskeyDismissedError | PasskeyLoginError => {
  const name = error instanceof DOMException ? error.name : undefined;
  if (name === 'NotAllowedError' || name === 'AbortError' || /cancell?ed/i.test(String(error))) {
    return new PasskeyDismissedError({ cause: error });
  }
  return new PasskeyLoginError({ cause: error });
};

/** Discriminates a passkey login failure so callers can pick a message without matching on error names. */
export type PasskeyFailure = 'dismissed' | 'rejected' | 'failed';

/**
 * Classify an error returned by the `RedeemPasskey` operation.
 * Anything unrecognized is reported as a generic failure rather than swallowed.
 */
export const classifyPasskeyFailure = (error: unknown): PasskeyFailure => {
  if (PasskeyDismissedError.is(error)) {
    return 'dismissed';
  }
  if (PasskeyRejectedError.is(error)) {
    return 'rejected';
  }
  return 'failed';
};
