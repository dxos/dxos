//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Assistant e2e harness failed. The underlying failure, where there is one, is the `cause`. */
export class AssistantE2eError extends BaseError.extend('AssistantE2eError', 'Assistant e2e harness failed.') {}
