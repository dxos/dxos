//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** SQLite test harness failed. The underlying failure, where there is one, is the `cause`. */
export class SqliteTestError extends BaseError.extend('SqliteTestError', 'SQLite test harness failed.') {}
