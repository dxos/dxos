//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/**
 * JMAP request failed: a non-2xx HTTP status, a JMAP problem-details body, or a method-level
 * `["error", { type, description }, id]` response. `status` carries the HTTP status (when the
 * failure is transport-level) and `type` the JMAP error type (when method-level) so callers can
 * recover with `Effect.catchTag` and distinguish auth (401) from other failures.
 */
export class JmapApiError extends BaseError.extend('JmapApiError', 'JMAP API request failed.') {
  constructor(
    public readonly status: number | undefined,
    public readonly detail: string,
    public readonly type?: string,
    options?: BaseErrorOptions,
  ) {
    super({ ...options, context: { ...(options?.context ?? {}), status, detail, type } });
  }
}

/** JMAP send payload missing required fields (`to` or body text). */
export class JmapSendMessageInvalidError extends BaseError.extend(
  'JmapSendMessageInvalidError',
  'Missing "to" or content in message.',
) {}

/** No JMAP identity permits the connection account as a `from` address, so the email cannot be sent. */
export class JmapSendIdentityNotFoundError extends BaseError.extend(
  'JmapSendIdentityNotFoundError',
  'No JMAP identity matches the connection account.',
) {
  constructor(account: string | undefined, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { account }, ...options });
  }
}
