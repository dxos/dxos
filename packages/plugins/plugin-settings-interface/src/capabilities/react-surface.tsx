//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';

import { SettingsInterfaceCapabilities } from './capabilities';
import { SETTINGS_DIALOG, SettingsDialog, SettingsSettings } from '../components';
import { SETTINGS_INTERFACE_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: SETTINGS_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === SETTINGS_DIALOG,
      component: () => {
        const state = useCapability(SettingsInterfaceCapabilities.MutableState);

        return <SettingsDialog selected={state.selected} onSelected={(selected) => (state.selected = selected)} />;
      },
    }),
    createSurface({
      id: `${SETTINGS_INTERFACE_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === SETTINGS_INTERFACE_PLUGIN,
      component: () => <SettingsSettings />,
    }),
  ]);
