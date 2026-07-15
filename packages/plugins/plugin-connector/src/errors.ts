//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { LayoutOperation } from '@dxos/app-toolkit';
import { type Operation } from '@dxos/compute';
import { BaseError } from '@dxos/errors';

const NO_CONNECTOR_MESSAGE = 'No Connector registered with id.' as const;

const SPACE_UNAVAILABLE_MESSAGE = 'Space is not available for the connection flow.' as const;

const NOT_REAUTHENTICATABLE_MESSAGE = 'Connection cannot be reauthenticated (no OAuth flow).' as const;

const AUTH_EXPIRED_MESSAGE = 'Connection credentials have expired and must be reauthenticated.' as const;

const TEST_FAILED_MESSAGE = 'Connection test failed.' as const;

/**
 * A connector's {@link TestConnection} probe rejected the stored credential or could not reach the
 * service. Its `message` is the user-facing reason shown in the connection UI.
 */
export class ConnectionTestError extends BaseError.extend('ConnectionTestError', TEST_FAILED_MESSAGE) {}

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
 * `@effect/platform`'s `ResponseError`.
 */
export const isUnauthorizedError = (error: unknown): boolean => {
  if (!Predicate.isRecord(error)) {
    return false;
  }
  if (error.code === 401 || error.status === 401) {
    return true;
  }
  if (Predicate.isRecord(error.context) && (error.context.code === 401 || error.context.status === 401)) {
    return true;
  }
  return error._tag === 'ResponseError' && Predicate.isRecord(error.response) && error.response.status === 401;
};
