//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A fault reading or writing the pipeline's SQLite stores (messages, questions). */
export class StoreError extends BaseError.extend('StoreError', 'Store error') {}
