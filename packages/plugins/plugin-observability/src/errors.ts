//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Observability plugin operation failed. The underlying failure, where there is one, is the `cause`. */
export class ObservabilityPluginError extends BaseError.extend(
  'ObservabilityPluginError',
  'Observability plugin operation failed.',
) {}
