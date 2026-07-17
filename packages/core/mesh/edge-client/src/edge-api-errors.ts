//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { type EdgeErrorData } from '@dxos/protocols';

/**
 * Typed error surface for the Effect-native edge client ({@link EdgeClient}).
 *
 * Replaces the thrown `EdgeCallFailedError`/`EdgeAuthChallengeError` from `@dxos/protocols` (which
 * stay on the WebSocket path). Consumers recover with `Effect.catchTag('EdgeRequestError', …)` /
 * `Effect.catchTag('EdgeAuthChallengeError', …)` rather than `instanceof`. The fields mirror what
 * `EdgeCallFailedError` carried so migrated call sites branch on the same information.
 */
export class EdgeRequestError extends BaseError.extend('EdgeRequestError', 'Edge request failed') {
  /** Whether the request may be retried (5xx / network / graceful-failure-with-Retry-After). */
  readonly isRetryable: boolean;
  /** Server-requested delay before retrying, from the `Retry-After` header (ms). */
  readonly retryAfterMs?: number;
  /** Verbatim `EdgeFailure.data` — carries the open-ended `data.type` vocabulary consumers branch on. */
  readonly data?: EdgeErrorData;

  constructor(
    options: { isRetryable?: boolean; retryAfterMs?: number; data?: EdgeErrorData } & BaseErrorOptions,
  ) {
    super(options);
    this.isRetryable = Boolean(options.isRetryable);
    this.retryAfterMs = options.retryAfterMs;
    this.data = options.data;
  }
}

/**
 * Raised when edge answers with a verifiable-presentation challenge the caller must sign — both the
 * `auth_challenge` response body and the flows (recover identity, join space by invitation) where a
 * consumer signs `challenge` and re-issues the request with the signature.
 */
export class EdgeAuthChallengeError extends BaseError.extend('EdgeAuthChallengeError', 'Edge auth challenge') {
  /** Base64 challenge to be signed by the caller. */
  readonly challenge: string;
  readonly data?: EdgeErrorData;

  constructor(options: { challenge: string; data?: EdgeErrorData } & BaseErrorOptions) {
    super(options);
    this.challenge = options.challenge;
    this.data = options.data;
  }
}
