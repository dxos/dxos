//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { useIntentDispatcher } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { SpaceAction, SPACE_PLUGIN } from '../meta';
import { type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const dispatch = useIntentDispatcher();

  return (
    <>
      <SettingsValue label={t('show hidden spaces label')}>
        <Input.Switch
          checked={settings.showHidden}
          onCheckedChange={(checked) =>
            dispatch({
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
