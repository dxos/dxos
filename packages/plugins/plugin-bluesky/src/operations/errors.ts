//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Bluesky sync failed. The underlying failure, where there is one, is the `cause`. */
export class BlueskySyncError extends BaseError.extend('BlueskySyncError', 'Bluesky sync failed.') {}
