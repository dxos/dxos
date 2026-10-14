//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Function operation failed. The underlying failure, where there is one, is the `cause`. */
export class FunctionError extends BaseError.extend('FunctionError', 'Function operation failed.') {}
