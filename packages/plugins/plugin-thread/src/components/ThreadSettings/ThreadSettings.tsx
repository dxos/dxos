//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';

export type ThreadSettingsProps = SettingsSurfaceProps<Settings.Settings>;

// TODO(burdon): Settings.
export const ThreadSettings = ({ settings: _settings }: ThreadSettingsProps) => {
  const { t: _t } = useTranslation(meta.id);
  return <SettingsForm.Root></SettingsForm.Root>;
};
