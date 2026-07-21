//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/** OAuth finished but `AccessToken.token` is still empty (race or incomplete persist). */
export class AccessTokenNotPopulatedError extends BaseError.extend(
  'AccessTokenNotPopulatedError',
  'Access token not yet populated.',
) {}

/** Gmail send payload missing required fields (`to` or body text). */
export class GmailSendMessageInvalidError extends BaseError.extend(
  'GmailSendMessageInvalidError',
  'Missing "to" or content in message.',
) {}

/** Foreign-key lookup returned an object that is not a Calendar (unexpected corruption / schema drift). */
export class CalendarForeignKeyWrongTypeError extends BaseError.extend(
  'CalendarForeignKeyWrongTypeError',
  'Foreign key query returned a non-calendar object.',
) {}

/** Classification requires at least one Tag in the space database. */
export class EmailClassificationNoTagsError extends BaseError.extend(
  'EmailClassificationNoTagsError',
  'No tags available in the database.',
) {}

/** Assistant response did not contain a usable classification line. */
export class EmailClassificationNotGeneratedError extends BaseError.extend(
  'EmailClassificationNotGeneratedError',
  'No classification generated.',
) {}

/** Model returned a tag label that does not match any existing Tag. */
export class EmailTagNotFoundError extends BaseError.extend('EmailTagNotFoundError', 'Tag not found.') {
  constructor(label: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { label }, ...options });
  }
}

/** Message DXN is not a queue (feed) reference — cannot append classification relation. */
export class MessageNotInFeedError extends BaseError.extend('MessageNotInFeedError', 'Message is not in a feed.') {}

/** Assistant response did not contain summary text. */
export class MailboxSummaryNotFoundError extends BaseError.extend('MailboxSummaryNotFoundError', 'No summary found.') {}

/** Google API returned an error response (non-200 or error payload in body). */
export class GoogleApiError extends BaseError.extend('GoogleApiError', 'Google API request failed.') {
  constructor(
    public readonly code: number | undefined,
    public readonly apiMessage: string,
    options?: BaseErrorOptions,
  ) {
    super({ ...options, context: { ...(options?.context ?? {}), code, apiMessage } });
  }
}

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

/** A mail-sync run failed. The provider-agnostic harness wraps each provider's error into this one type (as `cause`). */
export class MailSyncError extends BaseError.extend('MailSyncError', 'Mail sync failed.') {}

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
