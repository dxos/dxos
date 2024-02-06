//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { GPT_PLUGIN } from '../meta';
import { type GptSettingsProps } from '../types';

export const GptSettings = ({ settings }: { settings: GptSettingsProps }) => {
  const { t } = useTranslation(GPT_PLUGIN);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <>
      <SettingsValue label={t('settings debug label')}>
        <Input.Root>
          <Input.TextInput
            value={settings.apiKey}
            onChange={({ target: { value } }) => (settings.apiKey = value)}
            placeholder={t('settings api key')}
          />
        </Input.Root>
      </SettingsValue>
    </>
  );
};
