//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

export const DebugSettings = ({ settings }: { settings: DebugSettingsProps }) => {
  const { t } = useTranslation(DEBUG_PLUGIN);

  return (
    <>
      <SettingsValue label={t('show debug panel')}>
        <Input.Checkbox checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('show devtools panel')}>
        <Input.Checkbox checked={settings.devtools} onCheckedChange={(checked) => (settings.devtools = !!checked)} />
      </SettingsValue>
    </>
  );
};
