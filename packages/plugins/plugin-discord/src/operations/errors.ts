//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Discord sync failed. The underlying failure, where there is one, is the `cause`. */
export class DiscordSyncError extends BaseError.extend('DiscordSyncError', 'Discord sync failed.') {}
