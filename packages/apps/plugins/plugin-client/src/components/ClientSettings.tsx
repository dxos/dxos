//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { type ClientPluginProvides } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

export const ClientSettings = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const debugPlugin = usePlugin<ClientPluginProvides>(CLIENT_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.settings;

  return (
    <div role='none' className='space-b-2'>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox
            checked={settings.automerge}
            onCheckedChange={(checked) => (settings.automerge = !!checked)}
          />
          <Input.Label>{t('enable experimental automerge backend')}</Input.Label>
        </Input.Root>
      </div>
    </div>
  );
};
