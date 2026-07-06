//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Authentication with the freeq server failed (SASL rejected, session expired, bad credentials). */
export class FreeqAuthError extends BaseError.extend('FreeqAuthError', 'Freeq authentication failed.') {}

/** The freeq WebSocket connection failed or closed unexpectedly. */
export class FreeqConnectionError extends BaseError.extend('FreeqConnectionError', 'Freeq connection failed.') {}
