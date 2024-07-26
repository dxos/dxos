//
// Copyright 2023 DXOS.org
//

import { FolderOpen } from '@phosphor-icons/react';
import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { SpaceAction, SPACE_PLUGIN } from '../meta';
import { type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  return (
    <>
      {intentPlugin && (
        <>
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
          <SettingsValue label={t('save files to directory label')}>
            <Button
              onClick={async () => {
                await intentPlugin.provides.intent.dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.SELECT_DIRECTORY,
                });
              }}
            >
              <FolderOpen className={getSize(5)} />
            </Button>
          </SettingsValue>
        </>
      )}
    </>
  );
};
