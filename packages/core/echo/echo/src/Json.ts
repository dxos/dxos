//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import * as Database from './Database';
import * as Obj from './Obj';

/**
 * `JSON.stringify` replacer signature.
 *
 * Defined here (rather than re-imported from a UI package) so other ECHO-aware utilities can
 * share a stable signature without creating a dependency edge into the UI tree.
 */
export type JsonReplacer = (key: string, value: any) => any;

export type CreateRefReplacerOptions = {
  db: Database.Database;
  /** How many ref hops to follow. `0` leaves all refs as-is. Default: `1`. */
  depth?: number;
};

const isEncodedRef = (value: unknown): value is { '/': string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value as object).length === 1 &&
  typeof (value as { '/': unknown })['/'] === 'string';

const toJson = (obj: Obj.Any): unknown => (typeof (obj as any).toJSON === 'function' ? (obj as any).toJSON() : obj);

/**
 * Returns a {@link JsonReplacer} that inlines ECHO ref objects (`{ "/": "dxn:echo:..." }`) up to
 * `depth` ref hops. Beyond that depth refs are left in their encoded form.
 *
 * Implemented as a per-call `JSON.stringify` replacer (not a one-shot tree walk at root) so it
 * composes with wrappers like `safeStringify` that intercept the root call. JSON.stringify
 * already drives the recursion; we only need to (a) detect a ref at the current callback,
 * (b) resolve and return the target if hop budget remains, and (c) tag the returned object
 * with its hop count so children know how far in they are.
 *
 * The hop count is tracked per-object via a `WeakMap`: a ref-resolved target's children inherit
 * `parentHops + 1`; a regular intermediate object's children inherit `parentHops`. This makes the
 * budget count *ref hops*, not tree depth — a ref deep in a tree still resolves once when
 * `depth >= 1`.
 *
 * Note: ECHO objects' `toJSON` runs before the replacer is invoked, so by the time we see a
 * value refs are already encoded as `{ "/": "dxn:..." }`.
 */
export const createRefReplacer = ({ db, depth = 1 }: CreateRefReplacerOptions): JsonReplacer => {
  // Per-object hop count. Set when we return an object (via ref resolution or pass-through) so
  // the child callbacks (which carry that object as `this`) can read it.
  const hops = new WeakMap<object, number>();

  return function (this: any, key: string, value: any) {
    // Hop count for this call: hops at the parent, or 0 for the root.
    const parentHops = this && typeof this === 'object' ? (hops.get(this) ?? 0) : 0;
    if (isEncodedRef(value)) {
      if (parentHops >= depth) {
        return value;
      }

      // The `{ '/': string }` shape is shared with non-DXN IPLD-style refs (e.g. CIDs);
      // an unparseable string would otherwise crash the whole `JSON.stringify`.
      // Treat any parse miss as "leave as-is" rather than propagating.
      const dxnString = value['/'];
      if (!dxnString.startsWith('dxn:')) {
        return value;
      }

      let echoId: string | undefined;
      try {
        echoId = DXN.parse(dxnString).asEchoDXN()?.echoId;
      } catch {
        return value;
      }

      if (!echoId) {
        return value;
      }
      const target = db.getObjectById(echoId);
      if (!target) {
        return value;
      }

      const encoded = toJson(target);
      if (encoded != null && typeof encoded === 'object') {
        // Children of the resolved target are one hop deeper.
        hops.set(encoded as object, parentHops + 1);
      }
      return encoded;
    }

    // Pass-through object: children inherit the parent's hop count (this branch doesn't burn
    // budget).
    if (value != null && typeof value === 'object') {
      hops.set(value, parentHops);
    }

    return value;
  };
};
