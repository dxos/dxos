//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal';
import { Context, createContext } from 'react';

export type SettingsValues = { [index: string]: string };

export class SettingsStore {
  readonly _values: SettingsValues = deepSignal<SettingsValues>({ foo: '100' });

  get values() {
    return this._values;
  }

  getKey(key: string): any {
    localStorage.getItem(key);
  }

  setKey(key: string, value: string | undefined) {
    console.log('SET', key, value, this._values);
    if (value) {
      localStorage.setItem(key, value);
      this._values[key] = value;
    } else {
      localStorage.removeItem(key);
      delete this._values[key];
    }
    console.log('SET', key, value, this._values);
  }
}

export const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';

export type SettingsContextType = {
  store?: SettingsStore;
};

export const SettingsContext: Context<SettingsContextType> = createContext<SettingsContextType>({});
