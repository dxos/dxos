//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { SKETCH_PLUGIN } from '../meta';
import { type SketchSettingsProps } from '../types';

export const SketchSettings = ({ settings }: { settings: SketchSettingsProps }) => {
  const { t } = useTranslation(SKETCH_PLUGIN);

  return (
    <>
      <SettingsValue label={t('settings hover tools label')}>
        <Input.Switch
          checked={settings.showControlsOnHover}
          onCheckedChange={(checked) => (settings.showControlsOnHover = !!checked)}
        />
      </SettingsValue>

      <SettingsValue label={t('settings custom grid label')}>
        <Input.Switch checked={settings.customGrid} onCheckedChange={(checked) => (settings.customGrid = !!checked)} />
      </SettingsValue>
    </>
  );
};
