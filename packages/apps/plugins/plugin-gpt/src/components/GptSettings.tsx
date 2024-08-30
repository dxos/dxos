//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { GPT_PLUGIN } from '../meta';
import { type GptSettingsProps } from '../types';

export const GptSettings = ({ settings }: { settings: GptSettingsProps }) => {
  const { t } = useTranslation(GPT_PLUGIN);

  return (
    <>
      <SettingsValue label={t('settings api key')}>
        <Input.Root>
          <Input.TextInput
            spellCheck={false}
            value={settings.apiKey ?? ''}
            onChange={({ target: { value } }) => (settings.apiKey = value)}
          />
        </Input.Root>
      </SettingsValue>
    </>
  );
};
