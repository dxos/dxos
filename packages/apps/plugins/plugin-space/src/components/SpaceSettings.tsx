//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction, type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  return (
    <>
      {intentPlugin && (
        <SettingsValue label={t('show hidden spaces label')}>
          <Input.Switch
            checked={settings.showHidden}
            onCheckedChange={(checked) =>
              intentPlugin.provides.intent.dispatch({
                plugin: SPACE_PLUGIN,
                action: SpaceAction.TOGGLE_HIDDEN,
                data: { state: !!checked },
              })
            }
          />
        </SettingsValue>
      )}
    </>
  );
};
