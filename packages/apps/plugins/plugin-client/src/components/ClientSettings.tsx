//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, usePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { type ClientPluginProvides } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

export const ClientSettings = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const debugPlugin = usePlugin<ClientPluginProvides>(CLIENT_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  // TODO(burdon): Move to client.
  const debugSettings = debugPlugin.provides.settings.values;

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Checkbox
          checked={debugSettings.automerge}
          onCheckedChange={(checked) => (debugSettings.automerge = !!checked)}
        />
      </SettingsValue>
    </>
  );
};
