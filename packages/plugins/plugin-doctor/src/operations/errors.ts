//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A log query failed while filtering or aggregating rows already read from the store. */
export class LogQueryError extends BaseError.extend('LogQueryError', 'Log query failed.') {}
