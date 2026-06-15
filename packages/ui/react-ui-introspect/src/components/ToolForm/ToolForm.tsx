//
// Copyright 2026 DXOS.org
//

// Renders a react-ui-form for one MCP tool's input schema. The schema is an
// Effect `Schema.Struct(...)` from `@dxos/introspect-mcp/tools` — same one the
// server converts to zod for the MCP SDK at registration time. Authoring once
// in Effect and reusing here is the whole point of the converter.

import React, { useMemo } from 'react';

import { getPicker, type PickerKind } from '@dxos/introspect-tools';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldComponentProps } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { Picker } from '../Picker';
import type { ToolEntry } from '../types';

export type ToolFormProps = ThemedClassName<{
  /**
   * The tool whose input is being edited. Title + description display above the form.
   */
  tool: ToolEntry;
  /**
   * Initial values. Defaults to `{}` — most tool inputs are entirely optional
   * (`limit`, `compact`, `pluginId` filters), so an empty submission is valid.
   */
  defaultValues?: Record<string, unknown>;
  /**
   * Called when the user submits the form. The args object matches the tool's
   * Effect Schema `Type`; pass it straight to `client.callTool({ name, arguments })`.
   */
  onSubmit?: (args: Record<string, unknown>) => void;
  /**
   * Optional cancel handler — wires to Form's keyboard cancel.
   */
  onCancel?: () => void;
  /**
   * Option lists for picker-annotated fields (see `PickerAnnotationId` in
   * `@dxos/introspect-tools`). When omitted or empty, picker fields fall
   * back to a plain text input — typing a value still works.
   */
  pickerOptions?: Partial<Record<PickerKind, ReadonlyArray<string>>>;
}>;

export const ToolForm = ({ tool, defaultValues, onSubmit, onCancel, classNames, pickerOptions }: ToolFormProps) => {
  const { t } = useTranslation(translationKey);

  const fieldProvider = useMemo(() => {
    if (!pickerOptions) {
      return undefined;
    }

    return ({ schema, fieldProps }: { schema: { ast: any }; prop: string; fieldProps: FormFieldComponentProps }) => {
      const kind = getPicker(schema.ast);
      if (!kind) {
        return undefined;
      }
      const options = pickerOptions[kind];
      if (!options || options.length === 0) {
        return undefined;
      }

      const { type, getValue, onValueChange, placeholder } = fieldProps;
      return (
        <Picker
          options={options}
          value={(getValue() as string | undefined) ?? ''}
          onValueChange={(next) => onValueChange(type, next)}
          placeholder={placeholder}
        />
      );
    };
  }, [pickerOptions]);

  // Re-create the form when the tool changes so the Form internal state
  // resets. Without this, switching from list_packages to get_plugin would
  // try to re-validate the previous tool's values against the new schema.
  return (
    <div className={mx('flex flex-col gap-3 p-3 overflow-auto', classNames)}>
      <header>
        <h2 className='text-lg font-semibold'>{tool.title}</h2>
        {tool.description && (
          <p className='text-sm text-description mt-1'>{tool.description.replace(/\n/g, ' ').trim()}</p>
        )}
      </header>
      <Form.Root
        // `defaultValues` makes the form uncontrolled — it owns its own internal state via useFormHandler.
        // Passing `values` instead would require an `onValuesChanged` callback to write changes back;
        // users would otherwise see edits get reverted on every render.
        //
        // The `key` forces a remount when the parent swaps tool — without
        // it React reconciles in place and the previous tool's values stick,
        // re-validating against the new (incompatible) schema.
        key={tool.title}
        schema={tool.inputSchema as any}
        defaultValues={(defaultValues ?? {}) as any}
        onSave={(values) => onSubmit?.(values as Record<string, unknown>)}
        onCancel={onCancel}
      >
        <Form.Content>
          <Form.FieldSet fieldProvider={fieldProvider} />
          <Form.Submit label={t('run-tool.label')} />
        </Form.Content>
      </Form.Root>
    </div>
  );
};
