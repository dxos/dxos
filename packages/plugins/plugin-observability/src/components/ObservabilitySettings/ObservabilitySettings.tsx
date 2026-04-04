//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Settings as ObservabilitySettingsNs } from '../../types';

export const ObservabilitySettings = ({
  settings,
  onSettingsChange,
}: SettingsSurfaceProps<ObservabilitySettingsNs.Settings>) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings.title', { ns: meta.id })}>
        <Message.Root valence='info' classNames=' mb-form-padding'>
          <Message.Content>{t('observability.description')}</Message.Content>
        </Message.Root>
        <Settings.Group>
          <Settings.ItemInput title={t('observability-enabled.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.enabled}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enabled: !!checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
