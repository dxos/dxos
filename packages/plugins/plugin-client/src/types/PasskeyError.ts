//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

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

/** Creating a passkey failed for a reason other than the user dismissing the prompt. */
export class RegistrationFailed extends BaseError.extend('PasskeyRegistrationError', 'Passkey could not be created') {}

/** The native prompt never answered. The bridge cannot cancel it, so its sheet may still be on screen. */
export class TimedOut extends BaseError.extend('PasskeyTimedOutError', 'The passkey prompt did not respond') {}

/** This host cannot complete a passkey request, so none was started. */
export class Unavailable extends BaseError.extend(
  'PasskeyUnavailableError',
  'Passkeys are not available in this build',
) {}

/** Every way a passkey ceremony can fail, as `ConfigError.ConfigError` names its own union. */
export type PasskeyError = Dismissed | Rejected | LoginFailed | RegistrationFailed | TimedOut | Unavailable;

/** Longest a native prompt may stay unanswered; the WebAuthn ceremony ceiling. */
export const NATIVE_PROMPT_TIMEOUT = Duration.minutes(5);

/** Abandon a native passkey call that never answers. */
export const timeoutNativePrompt = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  duration: Duration.Input = NATIVE_PROMPT_TIMEOUT,
): Effect.Effect<A, E | TimedOut, R> =>
  Effect.timeoutOrElse(effect, { duration, orElse: () => Effect.fail(new TimedOut()) });

/** Discriminates a passkey failure so callers can pick a message without matching on error names. */
export type Failure = 'dismissed' | 'rejected' | 'failed';

/**
 * Whether the authenticator rejected because the prompt was dismissed. WebAuthn reports a dismissed
 * prompt and "no credential for this site" as the same `NotAllowedError`; the native (Tauri) bridge
 * rejects with a plain string rather than a `DOMException`.
 */
const isDismissal = (error: unknown): boolean => {
  const name = error instanceof DOMException ? error.name : undefined;
  return name === 'NotAllowedError' || name === 'AbortError' || /cancell?ed/i.test(String(error));
};

/** Classify a rejection from the authenticator while logging in. */
export const fromAssertion = (error: unknown): Dismissed | LoginFailed =>
  isDismissal(error) ? new Dismissed({ cause: error }) : new LoginFailed({ cause: error });

/** Classify a rejection from the authenticator while creating a passkey. */
export const fromRegistration = (error: unknown): Dismissed | RegistrationFailed =>
  isDismissal(error) ? new Dismissed({ cause: error }) : new RegistrationFailed({ cause: error });

/**
 * Classify an error returned by the `RedeemPasskey` or `CreatePasskey` operation.
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
