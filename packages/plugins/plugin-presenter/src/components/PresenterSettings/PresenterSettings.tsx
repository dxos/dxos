//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings } from '../../types';

export type PresenterSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const PresenterSettings = ({ settings, onSettingsChange }: PresenterSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('present-collections.label')} description={t('present-collections.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.presentCollections}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, presentCollections: !!checked }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
