//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type Database, type Type, Filter, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';

import { SHADOW_KEY_SOURCE, findShadowObject } from './shadow';

/**
 * Find a shadow object for the given object and type.
 * The subject may be a queued object, or an object form another space.
 */
// TODO(burdon): Formalize.
export const useShadowObject = <T extends Obj.Unknown>(
  db: Database.Database | undefined,
  subject: T,
  type: Type.AnyObj,
): [T | undefined, () => T] => {
  const id = Obj.getURI(subject);
  const objects = useQuery(db, Filter.type(type));

  const [target, setTarget] = useState<T | undefined>();
  useEffect(() => {
    setTarget(findShadowObject(objects as T[], id));
  }, [id, objects]);

  const createTarget = useCallback(() => {
    invariant(db);
    if (target) {
      return target;
    }

    const newObject = Obj.clone(subject);
    db.add<Obj.Unknown>(newObject);
    Obj.update(newObject, (newObject) => {
      Obj.getMeta(newObject).keys.push({ source: SHADOW_KEY_SOURCE, id });
    });
    setTarget(newObject);
    return newObject;
  }, [db, subject, target, id]);

  return [target, createTarget];
};
