//
// Copyright 2023 DXOS.org
//

import { get } from 'idb-keyval';
import React, { useState } from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { useAsyncEffect } from '../../../../../common/react-async/src';
import { SPACE_PLUGIN } from '../meta';
import { SPACE_DIRECTORY_HANDLE, SpaceAction, type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const [dirName, setDirName] = useState<string | null>(null);

  useAsyncEffect(async () => {
    const handle = await get(SPACE_DIRECTORY_HANDLE);
    setDirName(handle.name);
  }, []);

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
          <SettingsValue label={t('Save files to')}>
            <Button
              variant={'primary'}
              onClick={async () => {
                const handle = await intentPlugin.provides.intent.dispatch({
                  plugin: SPACE_PLUGIN,
                  action: SpaceAction.SELECT_DIRECTORY,
                });
                setDirName(handle.name);
              }}
            >
              {dirName || t('select path label')}
            </Button>
          </SettingsValue>
        </>
      )}
    </>
  );
};
