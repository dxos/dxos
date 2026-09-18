//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Debug operation failed. The underlying failure, where there is one, is the `cause`. */
export class DebugOperationError extends BaseError.extend('DebugOperationError', 'Debug operation failed.') {}
