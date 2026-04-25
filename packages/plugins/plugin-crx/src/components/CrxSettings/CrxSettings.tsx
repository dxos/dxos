//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';

export type CrxSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const CrxSettings = ({ settings, onSettingsChange }: CrxSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.Item title={t('settings.enabled.label')} description={t('settings.enabled.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enabled !== false}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enabled: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings.auto-open.label')} description={t('settings.auto-open.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.autoOpenAfterClip === true}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, autoOpenAfterClip: checked }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
