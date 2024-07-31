//
// Copyright 2023 DXOS.org
//

import { FolderOpen } from '@phosphor-icons/react';
import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { EXPORT_PLUGIN } from '../meta';
import { ExportAction, type ExportSettingsProps } from '../types';

export const ExportSettings = ({ settings }: { settings: ExportSettingsProps }) => {
  const { t } = useTranslation(EXPORT_PLUGIN);
  const dispatch = useIntentDispatcher();

  return (
    <>
      <SettingsValue label={t('save files to directory label')}>
        {settings.rootHandle && <Input.Label>{settings.rootHandle.name}</Input.Label>}
        <Button classNames='mis-2' onClick={() => dispatch({ action: ExportAction.SELECT_ROOT })}>
          <FolderOpen className={getSize(5)} />
        </Button>
      </SettingsValue>
      <SettingsValue label={t('auto export label')}>
        <Input.Switch checked={settings.autoExport} onCheckedChange={(checked) => (settings.autoExport = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('auto export interval label')}>
        <Input.TextInput
          type='number'
          min={1}
          value={settings.autoExportInterval / 1000}
          onInput={(event) => (settings.autoExportInterval = parseInt(event.currentTarget.value, 10) * 1000)}
        />
      </SettingsValue>
    </>
  );
};
