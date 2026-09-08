//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** No support service is configured, so nothing can file the report. */
export class SupportUnavailableError extends BaseError.extend(
  'SupportUnavailableError',
  'No support service is configured',
) {}

/** The support service refused or failed to file the report. */
export class SupportSubmitError extends BaseError.extend('SupportSubmitError', 'Failed to file the support report') {}
