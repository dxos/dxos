//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Doc } from '@dxos/echo-doc';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';

/**
 * An accessor for a value within an object, once the object's document has loaded; undefined while it
 * loads (an object a lazy query backed by the index's copy) or when there is no object.
 */
export const useDocAccessor = <T extends AnyProperties>(
  obj: T | undefined,
  path: Doc.KeyPath | Extract<keyof T, string | number>,
): Doc.Accessor<T> | undefined => {
  const [, setLoaded] = useState(0);
  const loaded = obj !== undefined && Doc.isLoaded(obj);
  useEffect(() => {
    if (obj === undefined || loaded) {
      return;
    }

    let mounted = true;
    Doc.load(obj).then(
      () => mounted && setLoaded((count) => count + 1),
      (err) => log.catch(err),
    );
    return () => {
      mounted = false;
    };
  }, [obj, loaded]);

  const pathKey = JSON.stringify(path);
  return useMemo(
    () => (obj !== undefined && loaded ? Doc.createAccessor(obj, path) : undefined),
    [obj, loaded, pathKey],
  );
};
