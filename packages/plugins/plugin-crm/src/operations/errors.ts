//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** CRM operation failed. The underlying failure, where there is one, is the `cause`. */
export class CrmOperationError extends BaseError.extend('CrmOperationError', 'CRM operation failed.') {}
