//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';
import { type EditorInputMode, EditorInputModes, type EditorViewMode, EditorViewModes } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { type Markdown } from '../../types';

export const MarkdownSettings = ({ settings }: { settings: Markdown.Settings }) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('default view mode label')}>
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>

          <ControlItemInput title={t('editor input mode label')}>
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>

          <ControlItemInput title={t('settings toolbar label')}>
            <Input.Switch checked={settings.toolbar} onCheckedChange={(checked) => (settings.toolbar = !!checked)} />
          </ControlItemInput>

          <ControlItemInput title={t('settings numbered headings label')}>
            <Input.Switch
              checked={settings.numberedHeadings}
              onCheckedChange={(checked) => (settings.numberedHeadings = !!checked)}
            />
          </ControlItemInput>

          <ControlItemInput title={t('settings folding label')}>
            <Input.Switch checked={settings.folding} onCheckedChange={(checked) => (settings.folding = !!checked)} />
          </ControlItemInput>

          <ControlItemInput title={t('settings experimental label')}>
            <Input.Switch
              checked={settings.experimental}
              onCheckedChange={(checked) => (settings.experimental = !!checked)}
            />
          </ControlItemInput>

          <ControlItemInput title={t('settings debug label')}>
            <Input.Switch checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
          </ControlItemInput>

          {settings.debug && (
            <ControlItemInput title={t('settings debug textarea label', { ns: meta.id })}>
              <Input.TextArea
                rows={5}
                value={settings.typewriter}
                onChange={({ target: { value } }) => (settings.typewriter = value)}
                placeholder={t('settings debug placeholder')}
              />
            </ControlItemInput>
          )}
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
