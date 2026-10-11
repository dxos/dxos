//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { ContextDisposedError } from '@dxos/context';
import { Doc } from '@dxos/echo-doc';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';

/**
 * Whether the documents of the given objects are in memory, loading any that are not and re-rendering once
 * they all arrive. Query results are backed by the index's copy, so code that reads an object's document
 * (its history, a version, cursors) waits for this first.
 */
export const useDocLoaded = (objects: AnyProperties | readonly (AnyProperties | undefined)[] | undefined): boolean => {
  const list = useMemo(
    () => (Array.isArray(objects) ? objects : [objects]).filter((obj): obj is AnyProperties => obj !== undefined),
    [objects],
  );
  const [, setArrived] = useState(0);
  const loaded = list.every((obj) => Doc.isLoaded(obj));
  useEffect(() => {
    if (loaded) {
      return;
    }

    let mounted = true;
    for (const obj of list.filter((obj) => !Doc.isLoaded(obj))) {
      Doc.load(obj).then(
        () => mounted && setArrived((count) => count + 1),
        (err) => {
          if (!(err instanceof ContextDisposedError)) {
            log.catch(err);
          }
        },
      );
    }
    return () => {
      mounted = false;
    };
  }, [list, loaded]);

  return loaded;
};

/**
 * An accessor for a value within an object, once the object's document has loaded; undefined while it
 * loads or when there is no object.
 */
export const useDocAccessor = <T extends AnyProperties>(
  obj: T | undefined,
  path: Doc.KeyPath | Extract<keyof T, string | number>,
): Doc.Accessor<T> | undefined => {
  const loaded = useDocLoaded(obj);
  const pathKey = JSON.stringify(path);
  const accessor = useMemo(
    () => (obj !== undefined && loaded ? Doc.createAccessor(obj, path) : undefined),
    [obj, loaded, pathKey],
  );

  // Holds the document while mounted, so eviction cannot release it under an accessor still in use.
  useEffect(() => {
    if (!accessor) {
      return;
    }
    const hold = () => {};
    accessor.handle.addListener('change', hold);
    return () => accessor.handle.removeListener('change', hold);
  }, [accessor]);

  return accessor;
};
