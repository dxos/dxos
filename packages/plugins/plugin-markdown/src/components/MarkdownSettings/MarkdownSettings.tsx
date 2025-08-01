//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { type EditorInputMode, EditorInputModes, type EditorViewMode, EditorViewModes } from '@dxos/react-ui-editor';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Markdown } from '../../types';

export const MarkdownSettings = ({ settings }: { settings: Markdown.Settings }) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Add skill test confirmation for entering vim mode.
  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('default view mode label')}>
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
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('editor input mode label')}>
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
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings toolbar label')}>
        <Input.Switch checked={settings.toolbar} onCheckedChange={(checked) => (settings.toolbar = !!checked)} />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings numbered headings label')}>
        <Input.Switch
          checked={settings.numberedHeadings}
          onCheckedChange={(checked) => (settings.numberedHeadings = !!checked)}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings folding label')}>
        <Input.Switch checked={settings.folding} onCheckedChange={(checked) => (settings.folding = !!checked)} />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings experimental label')}>
        <Input.Switch
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput
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
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
