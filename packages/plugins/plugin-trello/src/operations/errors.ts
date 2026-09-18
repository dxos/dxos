//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Trello sync failed. The underlying failure, where there is one, is the `cause`. */
export class TrelloSyncError extends BaseError.extend('TrelloSyncError', 'Trello sync failed.') {}
