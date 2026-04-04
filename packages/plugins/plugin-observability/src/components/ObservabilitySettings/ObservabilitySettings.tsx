//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings } from '../../types';

export type ObservabilitySettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const ObservabilitySettings = ({ settings, onSettingsChange }: ObservabilitySettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <Message.Root valence='info'>
          <Message.Content>{t('observability.description')}</Message.Content>
        </Message.Root>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('observability-enabled.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.enabled}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enabled: !!checked }))}
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
