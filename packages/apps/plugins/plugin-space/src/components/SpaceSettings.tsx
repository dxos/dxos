//
// Copyright 2023 DXOS.org
//

import { get } from 'idb-keyval';
import React, { useEffect, useState } from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { SPACE_DIRECTORY_HANDLE, SpaceAction, type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const [dirName, setDirName] = useState<string | null>(null);

  useEffect(() => {
    get(SPACE_DIRECTORY_HANDLE)
      .then((handle) => handle && setDirName(handle.name))
      .catch((err) => log.catch(err));
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
