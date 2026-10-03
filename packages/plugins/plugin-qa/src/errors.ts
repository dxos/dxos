//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** QA operation failed. The underlying failure, where there is one, is the `cause`. */
export class QaError extends BaseError.extend('QaError', 'QA operation failed.') {}
