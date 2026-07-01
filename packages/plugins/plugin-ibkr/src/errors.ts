//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const CONNECTION_MESSAGE =
  'Interactive Brokers connection is missing the Flex token or query id. Reconnect under Settings → Connections.' as const;

const SYNC_MESSAGE = 'Failed to fetch the Interactive Brokers Flex report.' as const;

/** The IBKR credential is absent or missing its Flex token / query id. */
export class IbkrConnectionError extends BaseError.extend('IbkrConnectionError', CONNECTION_MESSAGE) {}

/**
 * A Flex Web Service fetch failed (network error, rate-limit lockout, or generation timeout).
 * The originating message is preserved so rate-limit guidance reaches the caller.
 */
export class IbkrSyncError extends BaseError.extend('IbkrSyncError', SYNC_MESSAGE) {
  constructor(cause: unknown) {
    super({ message: cause instanceof Error ? cause.message : String(cause), cause });
  }
}
