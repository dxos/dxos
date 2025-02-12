//
// Copyright 2025 DXOS.org
//

import { SETTINGS_PLUGIN } from './actions';
import { Events } from '../common';
import { defineModule, definePlugin, lazy } from '../core';

export const SettingsPlugin = () =>
  definePlugin({ id: SETTINGS_PLUGIN }, [
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/store`,
      activatesOn: Events.Startup,
      activatesBefore: [Events.SetupSettings],
      activatesAfter: [Events.SettingsReady],
      activate: lazy(() => import('./store')),
    }),
  ]);
