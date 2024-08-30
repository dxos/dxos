//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { THREAD_PLUGIN } from '../meta';
import type { ThreadSettingsProps } from '../types';

export const ThreadSettings = ({ settings }: { settings: ThreadSettingsProps }) => {
  const { t } = useTranslation(THREAD_PLUGIN);

  return (
    <>
      <SettingsValue label={t('settings standalone label')}>
        <Input.Switch checked={settings.standalone} onCheckedChange={(checked) => (settings.standalone = !!checked)} />
      </SettingsValue>
    </>
  );
};
