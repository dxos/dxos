//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Operation invocation failed. The underlying failure, where there is one, is the `cause`. */
export class OperationInvocationError extends BaseError.extend(
  'OperationInvocationError',
  'Operation invocation failed.',
) {}
