//
// Copyright 2024 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { type EchoReactiveObject } from '@dxos/echo-schema';

import { getObjectCore } from '../core-db';

/**
 * @param obj
 */
// TODO(burdon): Rename/review SDK.
export const loadObject = <T extends EchoReactiveObject<any>>(obj: T): T => {
  return getObjectCore(obj).getDecoded(['data']) as T;
};

/**
 * EXPERIMENTAL - the API is subject to change.
 * @param objOrArray - an echo object or collection of objects with references to other echo objects.
 * @param valueAccessor - selector for a reference that needs to be loaded.
 *                        if return type is an array the method exits when all entries are non-null.
 *                        otherwise the method exits when valueAccessor is not null.
 * @param timeout - loading timeout, defaults to 5s.
 */
// TODO(burdon): Rename/review SDK.
export const loadObjectReferences = async <
  T extends EchoReactiveObject<any>,
  RefType,
  DerefType = RefType extends Array<infer U> ? Array<NonNullable<U>> : NonNullable<RefType>,
>(
  // TODO(burdon): Must be T OR T[] not either.
  objOrArray: T | T[],
  valueAccessor: (obj: T) => RefType,
  { timeout }: { timeout: number } = { timeout: 5_000 },
): Promise<T extends T[] ? Array<DerefType> : DerefType> => {
  const objectArray = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  const tasks = objectArray.map((obj) => {
    const core = getObjectCore(obj);
    const value = valueAccessor(obj);
    if (core.database == null) {
      return value;
    }

    const isLoadedPredicate = Array.isArray(value)
      ? () => (valueAccessor(obj) as any[]).every((v) => v != null)
      : () => valueAccessor(obj) != null;
    if (isLoadedPredicate()) {
      return value;
    }

    // TODO(burdon): Timeout if trying to load object that isn't there.
    return asyncTimeout(
      core.database._updateEvent.waitFor(() => isLoadedPredicate()).then(() => valueAccessor(obj)),
      timeout,
    );
  });

  const result = await Promise.all(tasks);
  return (Array.isArray(objOrArray) ? result : result[0]) as any;
};
