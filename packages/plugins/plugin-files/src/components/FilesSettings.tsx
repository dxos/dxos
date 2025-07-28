//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { IconButton, Input, Message, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { FILES_PLUGIN } from '../meta';
import { type FilesState, LocalFilesAction, type FilesSettingsProps } from '../types';

export const FilesSettings = ({ settings, state }: { settings: FilesSettingsProps; state: FilesState }) => {
  const { t } = useTranslation(FILES_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput
        label={t('save files to directory label')}
        secondary={
          <Message.Root valence='warning'>
            <Message.Content>{t('save files to directory description')}</Message.Content>
          </Message.Root>
        }
      >
        {state.rootHandle && <Input.Label>{state.rootHandle.name}</Input.Label>}
        <IconButton
          icon='ph--folder--regular'
          classNames='mis-2'
          onClick={() => dispatch(createIntent(LocalFilesAction.SelectRoot))}
          label={t('save files to directory label')}
          iconOnly
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('trigger export label')}>
        <IconButton
          icon='ph--floppy-disk--regular'
          classNames='mis-2'
          onClick={() => dispatch(createIntent(LocalFilesAction.Export))}
          label={t('trigger export label')}
          iconOnly
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('trigger import label')}>
        <IconButton
          icon='ph--folder-open--regular'
          classNames='mis-2'
          onClick={() => dispatch(createIntent(LocalFilesAction.Import))}
          label={t('trigger import label')}
          iconOnly
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('auto export label')}>
        <Input.Switch
          disabled={!state.rootHandle}
          checked={state.rootHandle ? settings.autoExport : false}
          onCheckedChange={(checked) => (settings.autoExport = !!checked)}
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('auto export interval label')}>
        <Input.TextInput
          type='number'
          min={1}
          value={settings.autoExportInterval / 1000}
          onInput={(event) => (settings.autoExportInterval = parseInt(event.currentTarget.value, 10) * 1000)}
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('open local files label')}>
        <Input.Switch
          checked={settings.openLocalFiles}
          onCheckedChange={(checked) => (settings.openLocalFiles = !!checked)}
        />
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
