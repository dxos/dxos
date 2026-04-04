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
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('settings-grid-show.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.showGrid !== false}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showGrid: checked }))}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('settings-grid-type.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.gridType === 'dotted'}
              onCheckedChange={(checked) =>
                onSettingsChange?.((s) => ({ ...s, gridType: checked ? 'dotted' : 'mesh' }))
              }
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
