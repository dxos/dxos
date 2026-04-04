//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';
import { type EditorInputMode, EditorInputModes, type EditorViewMode, EditorViewModes } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { type Markdown } from '../../types';

export type MarkdownSettingsProps = SettingsSurfaceProps<Markdown.Settings>;

export const MarkdownSettings = ({ settings, onSettingsChange }: MarkdownSettingsProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('default-view-mode.label')}>
            <Select.Root
              disabled={!onSettingsChange}
              value={settings.defaultViewMode}
              onValueChange={(value) => {
                onSettingsChange?.((s) => ({ ...s, defaultViewMode: value as EditorViewMode }));
              }}
            >
              <Select.TriggerButton disabled={!onSettingsChange} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {EditorViewModes.map((mode) => (
                      <Select.Option key={mode} value={mode}>
                        {t(`view-mode.${mode}.label`, { ns: '@dxos/react-ui-editor' })}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('editor-input-mode.label')}>
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
                        {t(`settings-editor-input-mode.${mode}.label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('settings-toolbar.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.toolbar}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, toolbar: !!checked }))}
            />
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('settings-numbered-headings.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.numberedHeadings}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, numberedHeadings: !!checked }))}
            />
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('settings-folding.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.folding}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, folding: !!checked }))}
            />
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('settings-experimental.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.experimental}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, experimental: !!checked }))}
            />
          </SettingsForm.ItemInput>

          <SettingsForm.ItemInput title={t('settings-debug.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.debug}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, debug: !!checked }))}
            />
          </SettingsForm.ItemInput>

          {settings.debug && (
            <SettingsForm.ItemInput title={t('settings-debug-typewriter.label', { ns: meta.id })}>
              <Input.TextArea
                disabled={!onSettingsChange}
                rows={5}
                value={settings.typewriter}
                onChange={({ target: { value } }) => onSettingsChange?.((s) => ({ ...s, typewriter: value }))}
                placeholder={t('settings-debug-typewriter.placeholder')}
              />
            </SettingsForm.ItemInput>
          )}
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
