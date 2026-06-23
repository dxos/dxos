//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const MISSING_HANDLE_MESSAGE =
  'Bluesky access token has no `account` (handle/DID) set; cannot resolve XRPC actor.' as const;

const SYNC_DATABASE_MISSING_MESSAGE = 'No database for connection/binding ref.' as const;

const PDS_RESOLUTION_FAILED_MESSAGE =
  "Could not resolve the atproto PDS endpoint for this handle/DID; authenticated XRPC requires the user's actual PDS." as const;

/**
 * The integration's `accessToken.account` (atproto handle / DID) was not
 * set — `account` is needed to resolve XRPC `actor` parameters.
 */
export class MissingBlueskyHandleError extends BaseError.extend('MissingBlueskyHandleError', MISSING_HANDLE_MESSAGE) {}

/** Connection/binding ref had no resolvable ECHO database (invoker did not provide `Database.layer`). */
export class SyncDatabaseMissingError extends BaseError.extend(
  'SyncDatabaseMissingError',
  SYNC_DATABASE_MISSING_MESSAGE,
) {}

/**
 * Could not resolve the user's PDS endpoint. Atproto identities are sharded
 * across many PDSes (including bsky.social's own per-user
 * `*.host.bsky.network` shards), so there is no safe default to fall back to;
 * a failed resolution surfaces here rather than getting silently routed at
 * the wrong host.
 */
export class PdsResolutionFailedError extends BaseError.extend(
  'PdsResolutionFailedError',
  PDS_RESOLUTION_FAILED_MESSAGE,
) {}
