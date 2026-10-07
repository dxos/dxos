//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/** OAuth finished but `AccessToken.token` is still empty (race or incomplete persist). */
export class AccessTokenNotPopulatedError extends BaseError.extend(
  'AccessTokenNotPopulatedError',
  'Access token not yet populated.',
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

/** A mail-sync run failed. The provider-agnostic harness wraps each provider's error into this one type (as `cause`). */
export class MailSyncError extends BaseError.extend('MailSyncError', 'Mail sync failed.') {}
