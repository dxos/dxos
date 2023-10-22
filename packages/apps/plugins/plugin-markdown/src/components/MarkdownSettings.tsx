//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugin } from '@dxos/react-surface';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { EditorModes } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN, type MarkdownPluginProvides } from '../types';

export const MarkdownSettings = () => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const markdownPlugin = usePlugin<MarkdownPluginProvides>(MARKDOWN_PLUGIN);
  if (!markdownPlugin) {
    return null;
  }

  const settings = markdownPlugin.provides.settings;
  const handleValueChange = (value: string) => {
    switch (value) {
      case 'vim':
        settings.editorMode = 'vim';
        break;

      default:
        settings.editorMode = 'default';
    }
  };

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <div>
      <Input.Root>
        <Input.Label>{t('editor mode label')}</Input.Label>
        <Select.Root value={settings.editorMode} onValueChange={handleValueChange}>
          <Select.TriggerButton classNames='mbs-0.5' placeholder={t('select editor mode placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {EditorModes.map((mode) => (
                  <Select.Option key={mode} value={mode}>
                    {t(`${mode} editor mode label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </Input.Root>
    </div>
  );
};
