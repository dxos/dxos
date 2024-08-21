//
// Copyright 2023 DXOS.org
//

import { FloppyDisk, Folder, FolderOpen } from '@phosphor-icons/react';
import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, Message, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { FILES_PLUGIN } from '../meta';
import { LocalFilesAction, type FilesSettingsProps } from '../types';

export const FilesSettings = ({ settings }: { settings: FilesSettingsProps }) => {
  const { t } = useTranslation(FILES_PLUGIN);
  const dispatch = useIntentDispatcher();

  return (
    <>
      <SettingsValue
        label={t('save files to directory label')}
        secondary={
          <Message.Root valence='warning'>
            <Message.Body>{t('save files to directory description')}</Message.Body>
          </Message.Root>
        }
      >
        {settings.rootHandle && <Input.Label>{settings.rootHandle.name}</Input.Label>}
        <Button classNames='mis-2' onClick={() => dispatch({ action: LocalFilesAction.SELECT_ROOT })}>
          <Folder className={getSize(5)} />
        </Button>
      </SettingsValue>
      <SettingsValue label={t('trigger export label')}>
        <Button classNames='mis-2' onClick={() => dispatch({ action: LocalFilesAction.EXPORT })}>
          <FloppyDisk className={getSize(5)} />
        </Button>
      </SettingsValue>
      <SettingsValue label={t('trigger import label')}>
        <Button classNames='mis-2' onClick={() => dispatch({ action: LocalFilesAction.IMPORT })}>
          <FolderOpen className={getSize(5)} />
        </Button>
      </SettingsValue>
      <SettingsValue label={t('auto export label')}>
        <Input.Switch
          disabled={!settings.rootHandle}
          checked={settings.rootHandle ? settings.autoExport : false}
          onCheckedChange={(checked) => (settings.autoExport = !!checked)}
        />
      </SettingsValue>
      <SettingsValue label={t('auto export interval label')}>
        <Input.TextInput
          type='number'
          min={1}
          value={settings.autoExportInterval / 1000}
          onInput={(event) => (settings.autoExportInterval = parseInt(event.currentTarget.value, 10) * 1000)}
        />
      </SettingsValue>
      <SettingsValue label={t('open local files label')}>
        <Input.Switch
          checked={settings.openLocalFiles}
          onCheckedChange={(checked) => (settings.openLocalFiles = !!checked)}
        />
      </SettingsValue>
    </>
  );
};
