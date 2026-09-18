//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Code operation failed. The underlying failure, where there is one, is the `cause`. */
export class CodeOperationError extends BaseError.extend('CodeOperationError', 'Code operation failed.') {}
