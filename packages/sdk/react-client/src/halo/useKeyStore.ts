//
// Copyright 2023 DXOS.org
//

import { useMemo, useReducer } from 'react';

// TODO(burdon): Move to settings plugin.
export class KeyStore {
  private _keyMap = new Map<string, string>();

  constructor(private readonly _defaultKeys: string[] = []) {}

  get map() {
    return this._keyMap;
  }

  // TODO(burdon): Create subkeys.
  initialize(): this {
    this._defaultKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      this.setKey(key, value ?? '');
    });

    return this;
  }

  getKey(key: string): void {
    localStorage.getItem(key);
  }

  setKey(key: string, value: string): void {
    localStorage.setItem(key, '');
    this._keyMap.set(key, value);
  }
}

/**
 * Settings store.
 * @deprecated Replace with HALO key store when available.
 */
export const useKeyStore = (
  defaultKeys: string[] = [],
): [Map<string, string>, (key: string, value: string) => void] => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const store = useMemo(() => new KeyStore(defaultKeys).initialize(), [defaultKeys]);
  const setKey = (key: string, value: string) => {
    store.setKey(key, value);
    forceUpdate();
  };

  return [store.map, setKey];
};
