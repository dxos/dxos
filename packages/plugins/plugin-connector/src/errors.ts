//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import { BaseError } from '@dxos/errors';

const NO_CONNECTOR_MESSAGE = 'No Connector registered with id.' as const;

const SPACE_UNAVAILABLE_MESSAGE = 'Space is not available for the connection flow.' as const;

const NOT_REAUTHENTICATABLE_MESSAGE = 'Connection cannot be reauthenticated (no OAuth flow).' as const;

const AUTH_EXPIRED_MESSAGE = 'Connection credentials have expired and must be reauthenticated.' as const;

const TEST_FAILED_MESSAGE = 'Connection test failed.' as const;

const SYNC_FAILED_MESSAGE = 'Connection sync could not be run.' as const;

const SYNC_ROUTINE_MISSING_MESSAGE = 'No sync routine exists for the connection.' as const;
const ACCOUNT_MISMATCH_MESSAGE = 'Target is already synced from a different account.' as const;

const SYNC_SCAFFOLD_MESSAGE = 'Sync routine could not be scaffolded.' as const;

/**
 * A connector's {@link TestConnection} probe rejected the stored credential or could not reach the
 * service. Its `message` is the user-facing reason shown in the connection UI.
 */
export class ConnectionTestError extends BaseError.extend('ConnectionTestError', TEST_FAILED_MESSAGE) {}

/**
 * A binding's sync could not be run at all — no handler is registered for the connector's sync
 * operation, or the space has no trigger monitor to force-run the schedule the connector declares.
 * Distinct from a sync that ran and failed, which the run's own process reports.
 */
export class ConnectionSyncError extends BaseError.extend('ConnectionSyncError', SYNC_FAILED_MESSAGE) {
  constructor(input: { connectorId?: string; cause?: unknown } = {}) {
    super({ context: { connectorId: input.connectorId }, cause: input.cause });
  }
}

/**
 * A trigger-declaring connector's connection has no sync routine (deleted, or declined at creation).
 * Sync is driven by the routine's trigger, and routines are only created through the create-routine
 * form — never silently — so the caller must (re)create it first: UI callers offer the seeded form
 * (see `Binding.syncOrOfferRoutine`), headless callers skip the connection.
 */
export class SyncRoutineMissingError extends BaseError.extend('SyncRoutineMissingError', SYNC_ROUTINE_MISSING_MESSAGE) {
  constructor(input: { connectorId?: string } = {}) {
    super({ context: { connectorId: input.connectorId } });
  }
}

/**
 * A bind was attempted between a target and a credential for a different remote account than the one
 * the target already syncs. Refused rather than reconciled: the target's feed holds the other account's
 * data, and binding here would merge two accounts into one object. A new target is the way to sync a
 * second account.
 */
export class TargetAccountMismatchError extends BaseError.extend(
  'TargetAccountMismatchError',
  ACCOUNT_MISMATCH_MESSAGE,
) {
  constructor(input: { targetId: string; expected: string; actual: string }) {
    super({ context: { targetId: input.targetId, expected: input.expected, actual: input.actual } });
  }
}

/**
 * The sync template could not build its routine draft: no subject, a subject with no connection to
 * sync, or a connector that declares no sync schedule. `message` carries the specific reason; one tag
 * suffices since every caller (the create-routine picker) handles the cases identically.
 */
export class SyncTemplateScaffoldError extends BaseError.extend('SyncTemplateScaffoldError', SYNC_SCAFFOLD_MESSAGE) {}

/** No Connector capability row matches the requested `connectorId`. */
export class ConnectorNotFoundError extends BaseError.extend('ConnectorNotFoundError', NO_CONNECTOR_MESSAGE) {
  constructor(connectorId: string) {
    super({ context: { connectorId } });
  }
}

/**
 * The space referenced by an in-flight connection flow could not be made
 * available — either it isn't registered with the client (e.g. the user
 * signed out between OAuth start and callback) or it failed to become ready
 * (network, replication, etc.). Both cases are equivalent from the flow's
 * perspective: there's no space to write the connection into.
 */
export class SpaceUnavailableError extends BaseError.extend('SpaceUnavailableError', SPACE_UNAVAILABLE_MESSAGE) {
  constructor(spaceId: string, cause?: unknown) {
    super({ context: { spaceId }, cause });
  }
}

/**
 * Reauthentication was requested for a connection whose connector has no OAuth
 * flow (e.g. a custom-token or IMAP connector). In-place token refresh only
 * applies to OAuth connectors; non-OAuth connections must be recreated.
 */
export class ConnectionNotReauthenticatableError extends BaseError.extend(
  'ConnectionNotReauthenticatableError',
  NOT_REAUTHENTICATABLE_MESSAGE,
) {
  constructor(connectorId: string) {
    super({ context: { connectorId } });
  }
}

/**
 * A connector's remote API call failed with HTTP 401: the stored credential is invalid or expired.
 * Carries a `notifyOverride` in `context` so the generic sync-failure toast (driven by
 * `Process.Info.error` + `LayoutOperation.getNotifyOverride`) shows a reauthentication message and a
 * button to the connection instead of the raw provider error. `action` is a serialized operation invocation
 * (the error crosses the process failure boundary, so it can't carry a live callback); the caller
 * supplies the navigate-to-connection invocation.
 */
export class ConnectionAuthExpiredError extends BaseError.extend('ConnectionAuthExpiredError', AUTH_EXPIRED_MESSAGE) {
  constructor(input: { connectionId: string; action: Operation.SerializedInvocation; cause?: unknown }) {
    super({
      cause: input.cause,
      context: {
        connectionId: input.connectionId,
        ...LayoutOperation.setNotifyOverride({
          title: 'Connection expired',
          description: 'The credentials for this connection have expired and must be reauthenticated to keep syncing.',
          actionLabel: 'Go to connection',
          action: input.action,
        }),
      },
    });
  }
}

/**
 * Detects HTTP 401 across the ad-hoc error shapes providers raise for auth failures: `GoogleApiError`/
 * `JmapApiError`-style `code`/`status` fields (mirrored onto `BaseError.context`), and
 * `@effect/platform`'s `ResponseError`. Walks the `cause` chain (bounded), since wrappers like
 * `MailSyncError.wrap` bury the provider error one level down without copying its fields.
 */
export const isUnauthorizedError = (error: unknown, depth: number = 4): boolean => {
  if (!Predicate.isObject(error)) {
    return false;
  }
  if (error.code === 401 || error.status === 401) {
    return true;
  }
  if (Predicate.isObject(error.context) && (error.context.code === 401 || error.context.status === 401)) {
    return true;
  }
  if (error._tag === 'ResponseError' && Predicate.isObject(error.response) && error.response.status === 401) {
    return true;
  }
  return depth > 0 && isUnauthorizedError(error.cause, depth - 1);
};
