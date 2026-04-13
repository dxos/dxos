//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, Select, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';
import { type EditorInputMode, EditorInputModes } from '@dxos/ui-editor';

import { meta } from '#meta';
import { type Settings } from '#types';

export type ScriptPluginSettingsProps = AppSurface.SettingsArticleProps<
  Settings.Settings,
  {
    onAuthenticate?: () => void;
  }
>;

export const ScriptPluginSettings = ({ settings, onSettingsChange, onAuthenticate }: ScriptPluginSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        {/* TODO(wittjosiah): Hide outside of dev environments. */}
        <SettingsForm.Item title={t('authenticate-action.label')} description={t('authenticate-action.description')}>
          <Button disabled={!onSettingsChange} onClick={onAuthenticate}>
            {t('authenticate-button.label')}
          </Button>
        </SettingsForm.Item>

        <SettingsForm.Item title={t('editor-input-mode.label')} description={t('editor-input-mode.description')}>
          <Select.Root
            disabled={!onSettingsChange}
            value={settings.editorInputMode ?? 'default'}
            onValueChange={(value) => {
              onSettingsChange?.((s) => ({ ...s, editorInputMode: value as EditorInputMode }));
            }}
          >
            <Select.TriggerButton
              disabled={!onSettingsChange}
              placeholder={t('select-editor-input-mode.placeholder')}
            />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {EditorInputModes.map((mode) => (
                    <Select.Option key={mode} value={mode}>
                      {t(`settings.editor-input-mode.${mode}.label`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
