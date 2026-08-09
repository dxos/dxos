//
// Copyright 2026 DXOS.org
//

import { EID, type Obj, type Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import * as Connection from '../types/Connection';

/**
 * Entity id a ref addresses, or `undefined` if its URI is not an `echo:` EID.
 *
 * Refs must never be compared by raw `uri` string: one `echo:` EID has several spellings for the
 * same object — the canonical local `echo:///<id>`, the legacy local `echo:/<id>` still present in
 * persisted data, and the qualified `echo://<spaceId>/<id>` — so a cursor stored under one spelling
 * would not match a freshly-made ref under another, and a binding would read as absent. `EID.parse`
 * (which `getEntityId` applies) normalizes all three.
 */
const refEntityId = (ref: Ref.Ref<any>): string | undefined => {
  const uri = EID.tryParse(ref.uri);
  return uri === undefined ? undefined : EID.getEntityId(uri);
};

/**
 * True when `cursor` is an external-sync cursor authenticated by `connection`'s access token.
 * `Cursor` no longer relates to `Connection` directly (that coupling was removed to make `Cursor`
 * an infrastructure type) — a connection's cursors are found by matching `spec.source` against its
 * `accessToken`. Fuzzy if an access token is ever shared across connections.
 */
export const isCursorForConnection = (
  cursor: Cursor.Cursor,
  connection: Connection.Connection,
): cursor is Cursor.ExternalCursor => {
  if (!Cursor.isExternal(cursor)) {
    return false;
  }
  const source = refEntityId(cursor.spec.source);
  return source !== undefined && source === refEntityId(connection.accessToken);
};

/** True when `cursor`'s `spec.target` is the given object. */
export const isCursorForTarget = (cursor: Cursor.Cursor, target: Obj.Unknown): boolean =>
  refEntityId(cursor.spec.target) === target.id;
