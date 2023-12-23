//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, parseIntentPlugin, usePlugin, useResolvePlugin } from '@dxos/app-framework';
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

  const { showHidden } = spacePlugin.provides.settings.values;

  return (
    <>
      <SettingsValue label={t('show hidden spaces label')}>
        <Input.Checkbox
          checked={showHidden}
          onCheckedChange={(checked) =>
            intentPlugin.provides.intent.dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.TOGGLE_HIDDEN,
              data: { state: !!checked },
            })
          }
        />
      </SettingsValue>
    </>
  );
};
