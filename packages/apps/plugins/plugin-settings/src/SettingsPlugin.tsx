//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { SETTINGS_PLUGIN, SettingsContext, SettingsStore } from './props';

export type SettingsPluginProvides = {
  store: SettingsStore;
};

export const SettingsPlugin = (): PluginDefinition<SettingsPluginProvides> => {
  const store = new SettingsStore();

  return {
    meta: {
      id: SETTINGS_PLUGIN,
    },
    provides: {
      store,
      context: ({ children }) => {
        return <SettingsContext.Provider value={{ store }}>{children}</SettingsContext.Provider>;
      },
    },
  };
};
