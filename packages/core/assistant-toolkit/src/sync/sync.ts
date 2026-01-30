//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * Syncs objects to the database.
 * If there's an object with a matching foreign key in the database, it will be updated.
 * Otherwise, a new object will be added.
 * Recursively syncs top-level refs.
 *
 * @param opts.foreignKeyId - The key to use for matching objects.
 */
export const syncObjects: (
  objs: Obj.Unknown[],
  opts: { foreignKeyId: string },
) => Effect.Effect<Obj.Unknown[], never, Database.Service> = Effect.fn('syncObjects')(function* (
  objs,
  { foreignKeyId },
) {
  return yield* Effect.forEach(
    objs,
    Effect.fnUntraced(function* (obj) {
      // Sync referenced objects.
      for (const key of Object.keys(obj)) {
        if (typeof key !== 'string' || key === 'id') continue;
        if (!Ref.isRef((obj as any)[key])) continue;
        const ref: Ref.Unknown = (obj as any)[key];
        if (!ref.target) continue;
        if (Obj.getDXN(ref.target).isLocalObjectId()) {
          // obj not persisted to db.
          const [target] = yield* syncObjects([ref.target], { foreignKeyId });
          (obj as any)[key] = Ref.make(target);
        }
      }

      const schema = Obj.getSchema(obj) ?? failedInvariant('No schema.');
      const foreignId = Obj.getKeys(obj, foreignKeyId)[0]?.id ?? failedInvariant('No foreign key.');
      const [existing] = yield* Database.Service.runQuery(
        Query.select(Filter.foreignKeys(schema, [{ source: foreignKeyId, id: foreignId }])),
      );
      log('sync object', {
        type: Obj.getTypename(obj),
        foreignId,
        existing: existing ? Obj.getDXN(existing) : undefined,
      });
      if (!existing) {
        yield* Database.Service.add(obj);
        return obj;
      } else {
        copyObjectData(existing, obj);
        return existing;
      }
    }),
    { concurrency: 1 },
  );
});

const copyObjectData = (existing: Obj.Unknown, newObj: Obj.Unknown) => {
  Obj.change(existing, (obj) => {
    // Copy properties from newObj to existing.
    for (const key of Object.keys(newObj)) {
      if (typeof key !== 'string' || key === 'id') continue;
      if (
        typeof (newObj as any)[key] !== 'string' &&
        typeof (newObj as any)[key] !== 'number' &&
        typeof (newObj as any)[key] !== 'boolean' &&
        !Ref.isRef((newObj as any)[key])
      )
        continue;
      (obj as any)[key] = (newObj as any)[key];
    }

    // Delete properties that don't exist in newObj.
    for (const key of Object.keys(obj)) {
      if (typeof key !== 'string' || key === 'id') continue;
      if (!(key in newObj)) {
        delete (obj as any)[key];
      }
    }

    // Update foreign keys.
    for (const foreignKey of Obj.getMeta(newObj).keys) {
      Obj.deleteKeys(obj, foreignKey.source);
      // TODO(dmaretskyi): Doesn't work: `Obj.getMeta(existing).keys.push(foreignKey);`
      Obj.getMeta(obj).keys.push({ ...foreignKey });
    }
  });
};
