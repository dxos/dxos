//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings } from '../../types';

export type SpacetimeSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const SpacetimeSettings = ({ settings, onSettingsChange }: SpacetimeSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('settings-show-axes.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.showAxes === true}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showAxes: checked }))}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('settings-show-fps.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.showFps === true}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showFps: checked }))}
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
