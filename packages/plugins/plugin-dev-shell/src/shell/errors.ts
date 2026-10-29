//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The host could not be reached or refused the request outright - never a non-zero exit code. */
export class DevShellError extends BaseError.extend('DevShellError', 'Dev shell failure') {}
