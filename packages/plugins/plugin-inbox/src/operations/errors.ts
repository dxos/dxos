//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Inbox operation failed. The underlying failure, where there is one, is the `cause`. */
export class InboxOperationError extends BaseError.extend('InboxOperationError', 'Inbox operation failed.') {}
