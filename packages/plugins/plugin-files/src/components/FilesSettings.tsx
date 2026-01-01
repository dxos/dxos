//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { IconButton, Input, Message, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type FilesSettingsProps, type FilesState, LocalFilesOperation } from '../types';

export const FilesSettings = ({ settings, state }: { settings: FilesSettingsProps; state: FilesState }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <Message.Root valence='warning' classNames='container-max-width'>
          <Message.Content>{t('save files to directory description')}</Message.Content>
        </Message.Root>
        <ControlGroup>
          <ControlItemInput
            title={t('save files to directory label')}
            {...(state.rootHandle && { description: state.rootHandle.name })}
          >
            <IconButton
              classNames='mis-2'
              icon='ph--folder--regular'
              iconOnly
              label={t('save files to directory label')}
              onClick={() => invokePromise(LocalFilesOperation.SelectRoot)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('trigger export label')}>
            <IconButton
              classNames='mis-2'
              icon='ph--floppy-disk--regular'
              iconOnly
              label={t('trigger export label')}
              onClick={() => invokePromise(LocalFilesOperation.Export)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('trigger import label')}>
            <IconButton
              classNames='mis-2'
              icon='ph--folder-open--regular'
              iconOnly
              label={t('trigger import label')}
              onClick={() => invokePromise(LocalFilesOperation.Import, {})}
            />
          </ControlItemInput>
          <ControlItemInput title={t('auto export label')}>
            <Input.Switch
              disabled={!state.rootHandle}
              checked={state.rootHandle ? settings.autoExport : false}
              onCheckedChange={(checked) => (settings.autoExport = !!checked)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('auto export interval label')}>
            <Input.TextInput
              type='number'
              min={1}
              value={settings.autoExportInterval / 1000}
              onInput={(event) => (settings.autoExportInterval = parseInt(event.currentTarget.value, 10) * 1000)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('open local files label')}>
            <Input.Switch
              checked={settings.openLocalFiles}
              onCheckedChange={(checked) => (settings.openLocalFiles = !!checked)}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
