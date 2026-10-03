//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** S3 operation failed. The underlying failure, where there is one, is the `cause`. */
export class S3Error extends BaseError.extend('S3Error', 'S3 operation failed.') {}
