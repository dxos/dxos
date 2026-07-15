//
// Copyright 2026 DXOS.org
//

import { type Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

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
