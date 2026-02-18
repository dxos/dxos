//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { IconButton, Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type FilesSettingsProps, type FilesState, LocalFilesOperation } from '../types';

export type FilesSettingsComponentProps = {
  settings: FilesSettingsProps;
  state: FilesState;
  onSettingsChange: (fn: (current: FilesSettingsProps) => FilesSettingsProps) => void;
};

export const FilesSettings = ({ settings, state, onSettingsChange }: FilesSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Message.Root valence='warning' classNames='container-max-width'>
          <Message.Content>{t('save files to directory description')}</Message.Content>
        </Message.Root>
        <Settings.Group>
          <Settings.ItemInput
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
          </Settings.ItemInput>
          <Settings.ItemInput title={t('trigger export label')}>
            <IconButton
              classNames='mis-2'
              icon='ph--floppy-disk--regular'
              iconOnly
              label={t('trigger export label')}
              onClick={() => invokePromise(LocalFilesOperation.Export)}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('trigger import label')}>
            <IconButton
              classNames='mis-2'
              icon='ph--folder-open--regular'
              iconOnly
              label={t('trigger import label')}
              onClick={() => invokePromise(LocalFilesOperation.Import, {})}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('auto export label')}>
            <Input.Switch
              disabled={!state.rootHandle}
              checked={state.rootHandle ? settings.autoExport : false}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, autoExport: !!checked }))}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('auto export interval label')}>
            <Input.TextInput
              type='number'
              min={1}
              value={settings.autoExportInterval / 1000}
              onInput={(event) =>
                onSettingsChange((s) => ({ ...s, autoExportInterval: parseInt(event.currentTarget.value, 10) * 1000 }))
              }
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('open local files label')}>
            <Input.Switch
              checked={settings.openLocalFiles}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, openLocalFiles: !!checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
