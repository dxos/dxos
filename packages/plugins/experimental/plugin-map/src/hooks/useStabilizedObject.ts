//
// Copyright 2023 DXOS.org
//

import { useState, useEffect } from 'react';

export const useStabilizedObject = <T>(obj: T, customEqual: (oldObject: T, newObject: T) => boolean) => {
  const [stableObj, setStableObj] = useState(obj);

  useEffect(() => {
    if (!customEqual(stableObj, obj)) {
      setStableObj(obj);
    }
  }, [obj, customEqual, stableObj]);

  return stableObj;
};
