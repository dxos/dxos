//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type SketchSettingsProps } from '../../types';

export const SketchSettings = ({ settings, onSettingsChange }: SettingsSurfaceProps<SketchSettingsProps>) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings.title', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('settings-hover-tools.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.autoHideControls}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, autoHideControls: !!checked }))}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('settings-grid-type.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.gridType === 'dotted'}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, gridType: checked ? 'dotted' : 'mesh' }))}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
