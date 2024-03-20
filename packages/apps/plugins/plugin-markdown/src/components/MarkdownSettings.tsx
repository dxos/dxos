//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { type EditorMode, EditorModes } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps } from '../types';

export const MarkdownSettings = ({ settings }: { settings: MarkdownSettingsProps }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <>
      <SettingsValue label={t('editor mode label')}>
        <Select.Root
          value={settings.editorMode ?? 'default'}
          onValueChange={(value) => {
            settings.editorMode = value as EditorMode;
          }}
        >
          <Select.TriggerButton placeholder={t('select editor mode placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {Object.keys(EditorModes).map((mode) => (
                  <Select.Option key={mode} value={mode}>
                    {t(`settings editor mode ${mode} label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>

      <SettingsValue label={t('settings toolbar label')}>
        <Input.Switch checked={settings.toolbar} onCheckedChange={(checked) => (settings.toolbar = !!checked)} />
      </SettingsValue>

      <SettingsValue
        label={t('settings debug label')}
        secondary={
          settings.debug ? (
            <Input.Root>
              <Input.TextArea
                rows={5}
                value={settings.typewriter}
                onChange={({ target: { value } }) => (settings.typewriter = value)}
                placeholder={t('settings debug placeholder')}
              />
            </Input.Root>
          ) : undefined
        }
      >
        <Input.Switch checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
      </SettingsValue>

      <SettingsValue label={t('settings experimental label')}>
        <Input.Switch
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </SettingsValue>
    </>
  );
};
