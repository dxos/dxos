//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Code operation failed. The underlying failure, where there is one, is the `cause`. */
export class CodeOperationError extends BaseError.extend('CodeOperationError', 'Code operation failed.') {}

/** Reading or writing a synced spec's local file failed. */
export class SpecSyncError extends BaseError.extend('SpecSyncError', 'Spec sync failed.') {}
