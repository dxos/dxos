//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * A host capability the CLI reached for was unavailable or refused the call — the clipboard
 * outside a secure context, a browser that could not be launched. The original is the `cause`.
 */
export class PlatformError extends BaseError.extend('PlatformError', 'Platform operation failed.') {}
