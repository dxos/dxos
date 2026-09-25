//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { BaseError, type Cancellation, isCancellation } from '@dxos/errors';
import { log } from '@dxos/log';

/**
 * The platform prompt produced no assertion. WebAuthn reports a dismissed prompt and
 * "this device has no passkey for this site" identically, so the two cannot be told apart.
 */
export class Dismissed
  extends BaseError.extend('PasskeyDismissedError', 'No passkey was presented')
  implements Cancellation
{
  /** Marks a dismissal as a cancellation so a generic reporter (the process runtime) can see it too. */
  readonly cancellation = true as const;
}

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
  if (Dismissed.is(error) || isCancellation(error)) {
    return 'dismissed';
  }
  if (Rejected.is(error)) {
    return 'rejected';
  }
  return 'failed';
};

/**
 * Report a failed redemption and classify it for the UI. A dismissed prompt is the user closing a
 * dialog, so it reports at `info` — at `error` it swamps the production error stream (DX-1281).
 */
export const report = (error: unknown): Failure => {
  const failure = classify(error);
  if (failure === 'dismissed') {
    log.info('passkey prompt dismissed', { error });
  } else {
    log.catch(error);
  }

  return failure;
};
