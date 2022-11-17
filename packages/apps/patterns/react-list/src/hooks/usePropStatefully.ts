//
// Copyright 2022 DXOS.org
//

import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';

import { randomString } from '@dxos/react-uikit';

const isEqual = <T>(a: T, b: T) => a === b;

/**
 * @deprecated
 */
export const usePropStatefully = <T>(
  propsValue: T,
  equivalentPredicate?: (a: T, b: T) => boolean
): [T, Dispatch<SetStateAction<T>>, string] => {
  const [value, setValue] = useState<T>(propsValue);
  const [valueSession, setValueSession] = useState(randomString());
  const mounted = useRef(false);
  const predicate = equivalentPredicate ?? isEqual<T>;

  useEffect(() => {
    if (mounted.current && !predicate(propsValue, value)) {
      setValue(propsValue);
      setValueSession(randomString());
    } else {
      mounted.current = true;
    }
  }, [propsValue]);

  return [value, setValue, valueSession];
};
