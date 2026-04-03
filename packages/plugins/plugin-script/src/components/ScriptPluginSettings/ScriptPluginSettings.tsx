//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Button, Select, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { type EditorInputMode, EditorInputModes } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { type ScriptSettings } from '../../types';

export type ScriptPluginSettingsProps = SettingsSurfaceProps<ScriptSettings> & {
  onAuthenticate?: () => void;
};

export const ScriptPluginSettings = ({ settings, onSettingsChange, onAuthenticate }: ScriptPluginSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings.title', { ns: meta.id })}>
        <Settings.Group>
          {/* TODO(wittjosiah): Hide outside of dev environments. */}
          <Settings.ItemInput title={t('authenticate-action.label')}>
            <Button disabled={!onSettingsChange} onClick={onAuthenticate}>
              {t('authenticate-button.label')}
            </Button>
          </Settings.ItemInput>

          <Settings.ItemInput title={t('editor-input-mode.label')}>
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
                        {t(`settings editor input mode ${mode} label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
