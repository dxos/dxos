//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal';
import { Context, createContext } from 'react';

export type SettingsValues = { [index: string]: string };

export class SettingsStore {
  public readonly _values: SettingsValues = deepSignal<SettingsValues>({});

  get values() {
    return this._values;
  }

  getKey(key: string): any {
    const value = localStorage.getItem(key);
    if (value) {
      this._values[key] = value;
    }
    return this._values[key];
  }

  setKey(key: string, value: string | undefined) {
    if (value) {
      localStorage.setItem(key, value);
      this._values[key] = value;
    } else {
      localStorage.removeItem(key);
      delete this._values[key];
    }
  }
}

export const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';

export type SettingsContextType = {
  store?: SettingsStore;
};

export const SettingsContext: Context<SettingsContextType> = createContext<SettingsContextType>({});
