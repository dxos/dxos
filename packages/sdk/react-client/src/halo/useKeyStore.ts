//
// Copyright 2023 DXOS.org
//

import { useEffect, useMemo, useReducer } from 'react';

/**
 * Settings store.
 * @deprecated Replace with HALO key store when available.
 */
// TODO(burdon): Move to react-client.
// NOTE: Will be replaced by HALO.
export const useKeyStore = (
  defaultKeys: string[] = [],
): [Map<string, string>, (key: string, value: string) => void] => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const keyMap = useMemo(() => new Map<string, string>(), []);
  useEffect(() => {
    defaultKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      keyMap.set(key, value ?? '');
      if (value === undefined) {
        localStorage.setItem(key, '');
      }
    });

    forceUpdate();
  }, []);

  const setKey = (key: string, value: string) => {
    localStorage.setItem(key, value);
    keyMap.set(key, value);
    forceUpdate();
  };

  return [keyMap, setKey];
};
