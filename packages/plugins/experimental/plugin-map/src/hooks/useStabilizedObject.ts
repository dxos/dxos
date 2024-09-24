//
// Copyright 2023 DXOS.org
//

import { useState, useEffect } from 'react';

/**
 * Intended use case: when a hook is returning an object whose reference identity
 * is changing more than you'd like, use this to control the rate of identity changes.
 *
 * @param obj - The object whose reference identity is changing too much.
 * @param customEqual - Have this return false when you want the object to actually change.
 * @returns The stabilized object.
 *
 * TODO(seagreen): changes will lag one render behind because of the way this uses useEffect
 */
export const useStabilizedObject = <T>(obj: T, customEqual: (oldObject: T, newObject: T) => boolean) => {
  const [stableObj, setStableObj] = useState(obj);

  useEffect(() => {
    if (!customEqual(stableObj, obj)) {
      setStableObj(obj);
    }
  }, [obj, customEqual, stableObj]);

  return stableObj;
};
