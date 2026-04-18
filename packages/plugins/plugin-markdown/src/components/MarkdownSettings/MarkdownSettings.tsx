//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input } from '@dxos/react-ui';
import { Settings as SettingsForm, type SettingsFieldProps } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Markdown } from '#types';

export type MarkdownSettingsProps = AppSurface.SettingsArticleProps<Markdown.Settings>;

const TypewriterField = ({ value, onChange, readonly }: SettingsFieldProps<string>) => (
  <Input.TextArea disabled={readonly} rows={5} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
);

export const MarkdownSettings = ({ settings, onSettingsChange }: MarkdownSettingsProps) => {
  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={meta.name ?? 'Editor'}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Markdown.Settings}
          visible={(path, values) => path !== 'typewriter' || !!values.debug}
          fieldMap={{ typewriter: TypewriterField }}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
