//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/plugin-settings';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { type EditorInputMode, EditorInputModes, type EditorViewMode, EditorViewModes } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps } from '../types';

export const MarkdownSettings = ({ settings }: { settings: MarkdownSettingsProps }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <>
      <SettingsValue label={t('default view mode label')}>
        <Select.Root
          value={settings.defaultViewMode}
          onValueChange={(value) => {
            settings.defaultViewMode = value as EditorViewMode;
          }}
        >
          <Select.TriggerButton />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {EditorViewModes.map((mode) => (
                  <Select.Option key={mode} value={mode}>
                    {t(`${mode} mode label`, { ns: 'react-ui-editor' })}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>

      <SettingsValue label={t('editor input mode label')}>
        <Select.Root
          value={settings.editorInputMode ?? 'default'}
          onValueChange={(value) => {
            settings.editorInputMode = value as EditorInputMode;
          }}
        >
          <Select.TriggerButton placeholder={t('select editor input mode placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {EditorInputModes.map((mode) => (
                  <Select.Option key={mode} value={mode}>
                    {t(`settings editor input mode ${mode} label`)}
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

      <SettingsValue label={t('settings numbered headings')}>
        <Input.Switch
          checked={settings.numberedHeadings}
          onCheckedChange={(checked) => (settings.numberedHeadings = !!checked)}
        />
      </SettingsValue>

      <SettingsValue label={t('settings experimental label')}>
        <Input.Switch
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
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
    </>
  );
};
