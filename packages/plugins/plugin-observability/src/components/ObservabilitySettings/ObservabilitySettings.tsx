//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';

export type ObservabilitySettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const ObservabilitySettings = ({ settings, onSettingsChange }: ObservabilitySettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <Message.Root valence='info'>
          <Message.Content>{t('observability.description')}</Message.Content>
        </Message.Root>
        <SettingsForm.Item
          title={t('observability-enabled.label')}
          description={t('observability-enabled.description')}
        >
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enabled}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enabled: !!checked }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
