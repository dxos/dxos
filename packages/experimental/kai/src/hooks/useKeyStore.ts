//
// Copyright 2023 DXOS.org
//

import { useEffect, useMemo, useReducer } from 'react';

// prettier-ignore
const defaultKeys = [
  'org.dxos.service.bot.proxy',

  // TODO(burdon): Move to credentials.
  'com.protonmail.username',
  'com.protonmail.password'
];

/**
 * Settings store.
 */
export const useKeyStore = (): [Map<string, string>, (key: string, value: string) => void] => {
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
