//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugin } from '@dxos/app-framework';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { EditorModes } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownPluginProvides } from '../types';

export const MarkdownSettings = () => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const markdownPlugin = usePlugin<MarkdownPluginProvides>(MARKDOWN_PLUGIN);
  if (!markdownPlugin) {
    return null;
  }

  const settings = markdownPlugin.provides.settings;

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <div role='none' className='space-b-2'>
      <Input.Root>
        <Input.Label classNames='text-base font-system-medium' asChild>
          <h3>{t('editor mode label')}</h3>
        </Input.Label>
        <Select.Root
          value={settings.editorMode}
          onValueChange={(value) => {
            settings.editorMode = value === 'vim' ? 'vim' : 'default';
          }}
        >
          <Select.TriggerButton classNames='mbs-0.5' placeholder={t('select editor mode placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {EditorModes.map((mode) => (
                  <Select.Option key={mode} value={mode}>
                    {t(`settings editor mode ${mode} label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </Input.Root>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox
            checked={settings.experimental}
            onCheckedChange={(checked) => (settings.experimental = !!checked)}
          />
          <Input.Label>{t('settings markdown experimental label')}</Input.Label>
        </Input.Root>
      </div>
    </div>
  );
};
