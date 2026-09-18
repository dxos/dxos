//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Plugin manager operation failed. The underlying failure, where there is one, is the `cause`. */
export class PluginManagerError extends BaseError.extend('PluginManagerError', 'Plugin manager operation failed.') {}
