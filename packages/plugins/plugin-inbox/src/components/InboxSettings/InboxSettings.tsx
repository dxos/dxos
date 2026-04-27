//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type InboxSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const InboxSettings = ({ settings, onSettingsChange }: InboxSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('settings.threads.label')} description={t('settings.threads.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.threads ?? false}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, threads: checked }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
