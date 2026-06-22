//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input } from '@dxos/react-ui';
import { Form, FormRow, type FormFieldRendererProps } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Markdown } from '#types';

export type MarkdownSettingsProps = AppSurface.SettingsProps<Markdown.Settings>;

export const MarkdownSettings = ({ settings, onSettingsChange }: MarkdownSettingsProps) => {
  return (
    <Form.Root
      variant='settings'
      schema={Markdown.Settings}
      readonly={!onSettingsChange}
      values={settings}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name}>
            <Form.FieldSet
              fieldMap={{ snippets: SnippetsField }}
              filter={(properties) =>
                settings.debug ? properties : properties.filter((property) => property.name !== 'snippets')
              }
            />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Multi-line snippet editor; replaces the single-line text input the schema would otherwise render. */
const SnippetsField = ({ type, readonly, onValueChange, onBlur, ...props }: FormFieldRendererProps<string>) => (
  <FormRow<string> readonly={readonly} {...props}>
    {({ value }) => (
      <Input.TextArea
        disabled={!!readonly}
        rows={5}
        value={value ?? ''}
        onBlur={onBlur}
        onChange={(event) => onValueChange(type, event.target.value)}
      />
    )}
  </FormRow>
);
