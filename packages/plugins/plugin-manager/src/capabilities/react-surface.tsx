//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';

import { ManagerCapabilities } from './capabilities';
import { SETTINGS_DIALOG, SettingsDialog, SettingsSettings } from '../components';
import { MANAGER_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: SETTINGS_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === SETTINGS_DIALOG,
      component: () => {
        const state = useCapability(ManagerCapabilities.MutableState);

        return <SettingsDialog selected={state.selected} onSelected={(selected) => (state.selected = selected)} />;
      },
    }),
    createSurface({
      id: `${MANAGER_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === MANAGER_PLUGIN,
      component: () => <SettingsSettings />,
    }),
  ]);
