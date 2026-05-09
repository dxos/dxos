//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const MISSING_HANDLE_MESSAGE =
  'Bluesky access token has no `account` (handle/DID) set; cannot resolve XRPC actor.' as const;

const INTEGRATION_DATABASE_MISSING_MESSAGE = 'No database for integration ref.' as const;

/**
 * The integration's `accessToken.account` (atproto handle / DID) was not
 * set — `account` is needed to resolve XRPC `actor` parameters.
 */
export class MissingBlueskyHandleError extends BaseError.extend('MissingBlueskyHandleError', MISSING_HANDLE_MESSAGE) {}

/** Integration ref had no resolvable ECHO database (invoker did not provide `Database.layer`). */
export class IntegrationDatabaseMissingError extends BaseError.extend(
  'IntegrationDatabaseMissingError',
  INTEGRATION_DATABASE_MISSING_MESSAGE,
) {}
