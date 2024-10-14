//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/plugin-settings';
import { Input, useTranslation } from '@dxos/react-ui';

import { PRESENTER_PLUGIN } from '../meta';
import { type PresenterSettingsProps } from '../types';

export const PresenterSettings = ({ settings }: { settings: PresenterSettingsProps }) => {
  const { t } = useTranslation(PRESENTER_PLUGIN);

  return (
    <>
      <SettingsValue label={t('present collections label')}>
        <Input.Switch
          checked={settings.presentCollections}
          onCheckedChange={(checked) => (settings.presentCollections = !!checked)}
        />
      </SettingsValue>
    </>
  );
};
