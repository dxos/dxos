//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * A connector sync operation could not resolve an ECHO database from the
 * connection/binding ref it was handed — the `OperationInvoker` was wired
 * without a `Database.layer`, so the handler must derive the database from the
 * ref's target and could not. Thrown by every connector sync handler (Trello,
 * Slack, Bluesky, Discord, Inbox, ...), so it lives here rather than being
 * redefined per plugin.
 */
export class SyncDatabaseMissingError extends BaseError.extend(
  'SyncDatabaseMissingError',
  'No database for connection/binding ref.',
) {}
