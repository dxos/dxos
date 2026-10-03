//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A `dx` command could not complete a local filesystem or terminal operation. */
export class CliError extends BaseError.extend('CliError', 'Command failed.') {}
