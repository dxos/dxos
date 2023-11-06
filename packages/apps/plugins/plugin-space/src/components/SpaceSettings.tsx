//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { parseIntentPlugin, usePlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction, type SpacePluginProvides } from '../types';

export const SpaceSettings = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  if (!spacePlugin || !intentPlugin) {
    return null;
  }

  const settings = spacePlugin.provides.settings;

  return (
    <>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox
            checked={settings.showHidden}
            onCheckedChange={(checked) =>
              intentPlugin.provides.intent.dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.TOGGLE_HIDDEN,
                data: { state: !!checked },
              })
            }
          />
          <Input.Label>{t('show hidden spaces label')}</Input.Label>
        </Input.Root>
      </div>
    </>
  );
};

export default SpaceSettings;
