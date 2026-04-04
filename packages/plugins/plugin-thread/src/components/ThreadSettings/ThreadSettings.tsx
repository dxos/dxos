//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings as ThreadSettingsNs } from '../../types';

// TODO(burdon): Settings.
export const ThreadSettings = ({ settings: _settings }: SettingsSurfaceProps<ThreadSettingsNs.Settings>) => {
  const { t: _t } = useTranslation(meta.id);
  return <Settings.Root></Settings.Root>;
};
