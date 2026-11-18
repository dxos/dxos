//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

/** The memory refused, could not be reached, or the input does not compile; the message says which. */
export class MemoryError extends BaseError.extend('MemoryError', 'Memory operation failed.') {}
