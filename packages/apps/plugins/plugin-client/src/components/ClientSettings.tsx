//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { type ClientSettingsProps } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

export const ClientSettings = ({ settings }: { settings: ClientSettingsProps }) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Checkbox checked={settings.automerge} onCheckedChange={(checked) => (settings.automerge = !!checked)} />
      </SettingsValue>
    </>
  );
};
