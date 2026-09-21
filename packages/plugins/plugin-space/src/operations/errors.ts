//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Space operation failed. The underlying failure, where there is one, is the `cause`. */
export class SpaceOperationError extends BaseError.extend('SpaceOperationError', 'Space operation failed.') {}
