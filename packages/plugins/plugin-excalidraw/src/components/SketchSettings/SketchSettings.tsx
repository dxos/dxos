//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings } from '../../types';

export type SketchSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const SketchSettings = ({ settings, onSettingsChange }: SketchSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('settings-hover-tools.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.autoHideControls}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, autoHideControls: !!checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-grid-type.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.gridType === 'dotted'}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, gridType: checked ? 'dotted' : 'mesh' }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
