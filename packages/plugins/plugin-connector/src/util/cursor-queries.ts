//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AccessToken, Cursor } from '@dxos/cursor';
import { Database, Filter, type Obj, Ref } from '@dxos/echo';

import * as Connection from '../types/Connection';

/**
 * True when `cursor` is an external-sync cursor authenticated by `connection`'s access token.
 * `Cursor` no longer relates to `Connection` directly (that coupling was removed to make `Cursor`
 * an infrastructure type) — a connection's cursors are found by matching `spec.source` against its
 * `accessToken` ref, compared by URI (cheap: refs expose it without a load). Fuzzy if an access
 * token is ever shared across connections.
 */
export const isCursorForConnection = (
  cursor: Cursor.Cursor,
  connection: Connection.Connection,
): cursor is Cursor.ExternalCursor =>
  Cursor.isExternal(cursor) && cursor.spec.source.uri === connection.accessToken.uri;

/** True when `cursor`'s `spec.target` is the given object. */
export const isCursorForTarget = (cursor: Cursor.Cursor, target: Obj.Unknown): boolean =>
  cursor.spec.target.uri === Ref.make(target).uri;

/**
 * Selects every `Cursor` object; callers filter with {@link isCursorForConnection} /
 * {@link isCursorForTarget} — there is no query-level nested-ref filter for a field one level below
 * a discriminated-union struct (`Query.referencedBy`'s typed key is top-level-only), so this mirrors
 * the codebase's existing pattern of a broad type query + in-memory filter (e.g.
 * `ConnectorAuthButton`'s connection filtering).
 */
export const CursorsQuery = Filter.type(Cursor.Cursor);

/**
 * Finds the {@link Connection} whose access token is `accessTokenRef` — the reverse of
 * {@link isCursorForConnection}, for callers (e.g. a provider's send/delete op) that only have an
 * external cursor's `spec.source` and need the Connection it authenticates. Fuzzy if an access token
 * is ever shared across connections.
 */
export const findConnectionForAccessToken = (db: Database.Database, accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
  Database.query(Filter.type(Connection.Connection)).run.pipe(
    Effect.provide(Database.layer(db)),
    Effect.map((connections) => connections.find((connection) => connection.accessToken.uri === accessTokenRef.uri)),
  );
