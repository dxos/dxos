//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { PRESENTER_PLUGIN } from '../meta';
import { PresenterSettingsSchema, type PresenterSettingsProps } from '../types';

export default () => {
  const settings = live<PresenterSettingsProps>({});

  return contributes(Capabilities.Settings, {
    schema: PresenterSettingsSchema,
    prefix: PRESENTER_PLUGIN,
    value: settings,
  });
};
