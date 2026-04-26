//
// Copyright 2025 DXOS.org
//

import { type Database, type Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { type JsonReplacer } from '@dxos/react-ui-syntax-highlighter';

export type CreateRefReplacerOptions = {
  db: Database.Database;
  /** How many levels of refs to follow. `0` leaves all refs as-is. Default: `1`. */
  depth?: number;
};

const isEncodedRef = (value: unknown): value is { '/': string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value as object).length === 1 &&
  typeof (value as { '/': unknown })['/'] === 'string';

const toJson = (obj: Obj.Any): unknown => (typeof (obj as any).toJSON === 'function' ? (obj as any).toJSON() : obj);

/**
 * Returns a {@link JsonReplacer} that walks the encoded form of an ECHO object and inlines
 * referenced objects up to `depth` levels.
 *
 * Beyond that depth refs are left in their standard `{ "/": "dxn:..." }` shape.
 *
 * Implemented as a `JSON.stringify` replacer (not a separate hook) because ECHO objects' `toJSON` runs
 * before the replacer is invoked — by the time we see a value, refs have already been encoded.
 *
 * The walk happens once at the root call (`key === ''`).
 */
export const createRefReplacer = ({ db, depth = 1 }: CreateRefReplacerOptions): JsonReplacer => {
  const visit = (value: any, remaining: number, seen: Set<object>): any => {
    if (value == null || typeof value !== 'object') {
      return value;
    }

    if (isEncodedRef(value)) {
      if (remaining <= 0) {
        return value;
      }
      const echoId = DXN.parse(value['/']).asEchoDXN()?.echoId;
      if (!echoId) {
        return value;
      }
      const target = db.getObjectById(echoId);
      if (!target) {
        return value;
      }

      return visit(toJson(target), remaining - 1, seen);
    }

    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, remaining, seen));
    }

    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = visit(child, remaining, seen);
    }

    return out;
  };

  return (key, value) => (key === '' ? visit(value, depth, new Set()) : value);
};
