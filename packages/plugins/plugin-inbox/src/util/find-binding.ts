//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Cursor } from '@dxos/cursor';
import { Database, Filter, type Obj } from '@dxos/echo';
import { CursorsQuery, isCursorForTarget } from '@dxos/plugin-connector';

/**
 * Finds the external-sync {@link Cursor} whose target is the given object (mailbox, calendar, …).
 * The cursor's `spec.source` is the access token that authenticates sync for that object; credentials
 * and sync re-invocation flow from it.
 *
 * `Cursor` has no reverse-ref index on `spec.target` (it's one level below a discriminated-union
 * struct field, which the typed `Query.referencedBy` key doesn't reach), so this scans every cursor
 * in the space and filters — mirrors `@dxos/plugin-connector`'s own cursor lookups.
 */
export const findBindingForTarget = (target: Obj.Unknown) =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(CursorsQuery).run;
    return cursors.find(
      (cursor): cursor is Cursor.ExternalCursor => Cursor.isExternal(cursor) && isCursorForTarget(cursor, target),
    );
  });
