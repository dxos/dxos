//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { Filter, Obj, type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { getSpace, useQuery } from '@dxos/react-client/echo';

/**
 * Find a shadow object for the given object and type.
 * The subject may be a queued object, or an object form another space.
 */
// TODO(burdon): Formalize.
export const useShadowObject = <T extends Obj.Any>(subject: T, type: Type.Obj.Any): [T | undefined, () => T] => {
  const id = Obj.getDXN(subject).toString();
  const space = getSpace(subject);
  const objects = useQuery(space, Filter.type(type));

  const [target, setTarget] = useState<T | undefined>();
  useEffect(() => {
    const target = objects.find((event) => {
      const meta = Obj.getMeta(event);
      return meta.keys.find((key) => key.source === 'echo' && key.id === id);
    });
    setTarget(target);
  }, [id, objects]);

  const createTarget = useCallback(() => {
    invariant(space);
    if (target) {
      return target;
    }

    const newObject = space.db.add(Obj.clone(subject));
    const meta = Obj.getMeta(newObject);
    meta.keys.push({ source: 'echo', id });
    setTarget(newObject);
    return newObject;
  }, [space, subject, target, id]);

  return [target, createTarget];
};
