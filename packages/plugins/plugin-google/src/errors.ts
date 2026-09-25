//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

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
