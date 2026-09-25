//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface, SettingsScope } from '@dxos/app-toolkit/ui';
import { Field } from '@dxos/react-ui';
import { Form, type FormFieldRendererProps } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Markdown } from '#types';

export type MarkdownSettingsProps = AppSurface.SettingsData;

export const MarkdownSettings = ({ subject }: MarkdownSettingsProps) => {
  const { settings, updateSettings } = useSettingsState<Markdown.Settings>(subject.atom);

  return (
    <Form.Root
      variant='settings'
      schema={Markdown.Settings}
      values={settings}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={meta.profile.name} actions={<SettingsScope prefix={meta.profile.key} />}>
            <Form.Fields
              fieldMap={{ snippets: SnippetsField }}
              filter={(properties) =>
                settings.debug ? properties : properties.filter((property) => property.name !== 'snippets')
              }
            />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Multi-line snippet editor; replaces the single-line text input the schema would otherwise render. */
const SnippetsField = ({
  type,
  label,
  jsonPath,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => (
  <Form.Field path={jsonPath} label={label} readonly={readonly} presentation={presentation}>
    <Field.Textarea
      disabled={!!readonly}
      rows={5}
      value={getValue() ?? ''}
      onBlur={onBlur}
      onChange={(event) => onValueChange(type, event.target.value)}
    />
  </Form.Field>
);

MarkdownSettings.displayName = 'MarkdownSettings';
