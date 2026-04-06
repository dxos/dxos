//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { IconButton, Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings, type FilesState } from '#types';

export type FilesSettingsProps = SettingsSurfaceProps<
  Settings.Settings,
  {
    state: FilesState;
    onSelectRoot?: () => void;
    onExport?: () => void;
    onImport?: () => void;
  }
>;

export const FilesSettings = ({
  settings,
  state,
  onSettingsChange,
  onSelectRoot,
  onExport,
  onImport,
}: FilesSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <Message.Root valence='warning'>
          <Message.Content>{t('save-files-to-directory.description')}</Message.Content>
        </Message.Root>
        <SettingsForm.Group>
          <SettingsForm.ItemInput
            title={t('save-files-to-directory.label')}
            {...(state.rootHandle && { description: state.rootHandle.name })}
          >
            <IconButton
              classNames='ms-2'
              icon='ph--folder--regular'
              iconOnly
              label={t('save-files-to-directory.label')}
              onClick={() => onSelectRoot?.()}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('trigger-export.label')}>
            <IconButton
              classNames='ms-2'
              icon='ph--floppy-disk--regular'
              iconOnly
              label={t('trigger-export.label')}
              onClick={() => onExport?.()}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('trigger-import.label')}>
            <IconButton
              classNames='ms-2'
              icon='ph--folder-open--regular'
              iconOnly
              label={t('trigger-import.label')}
              onClick={() => onImport?.()}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('auto-export.label')}>
            <Input.Switch
              disabled={!onSettingsChange || !state.rootHandle}
              checked={state.rootHandle ? settings.autoExport : false}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, autoExport: !!checked }))}
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('auto-export-interval.label')}>
            <Input.TextInput
              disabled={!onSettingsChange}
              type='number'
              min={1}
              value={settings.autoExportInterval / 1000}
              onInput={(event) =>
                onSettingsChange?.((s) => ({
                  ...s,
                  autoExportInterval: parseInt(event.currentTarget.value, 10) * 1000,
                }))
              }
            />
          </SettingsForm.ItemInput>
          <SettingsForm.ItemInput title={t('open-local-files.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.openLocalFiles}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, openLocalFiles: !!checked }))}
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
