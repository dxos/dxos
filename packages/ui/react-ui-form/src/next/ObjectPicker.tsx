//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Next } from '@dxos/react-ui/next';
import { hues } from '@dxos/ui-types';

import { type CreateOptions, type RefOption } from '#types';

// The parts, not the `Form` namespace: RefField renders this picker inside the Form's module cycle, and the namespace
// object reads every part when its module is evaluated.
import { FormRoot } from '../components/Form/FormControls.tsx';
import { FormActions, FormContent } from './Form.tsx';
import { FormFields } from './FormFieldDispatch.tsx';

type PickerCreateProps = Pick<CreateOptions, 'createInitialValuePath' | 'createFieldMap'> & {
  /** The inline create form's schema; with `onCreate`, the popup offers a create row for an unmatched query. */
  createSchema?: Schema.Codec<any, any>;
  /** The create row's text for the query (the translated `createOptionLabel`); `Create “{query}”` by default. */
  createLabel?: (query: string) => string;
  /** The create row's icon (`createOptionIcon`); a plus by default. */
  createIcon?: string;
  /** Persists the create form's values; awaited before the form closes. */
  onCreate?: (values: any) => unknown | Promise<unknown>;
};

type PickerBaseProps = PickerCreateProps & {
  options: RefOption[];
  loading?: boolean;
};

/**
 * The popup state shared by the pickers: open, and the query a chosen create row turned into a create form. Choosing
 * the create row also asks the popup to close, so `startCreate` reopens it in the same batch.
 */
const usePickerState = ({ options, createSchema, onCreate }: PickerBaseProps) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string>();
  const items = useMemo<Next.ComboboxOption[]>(
    () => options.map(({ id, label, description }) => ({ value: id, label, description })),
    [options],
  );
  const handleOpenChange = useCallback(({ open }: { open: boolean }) => {
    setOpen(open);
    if (!open) {
      setCreating(undefined);
    }
  }, []);
  const startCreate =
    createSchema !== undefined && onCreate !== undefined
      ? (query: string) => {
          setCreating(query);
          setOpen(true);
        }
      : undefined;
  return { open, setOpen, creating, setCreating, items, handleOpenChange, startCreate };
};

type CreateFormProps = Pick<PickerCreateProps, 'createInitialValuePath' | 'createFieldMap'> & {
  schema: Schema.Codec<any, any>;
  query: string;
  onSave: (values: any) => Promise<void>;
  onCancel: () => void;
};

/** The create form a picker's popup swaps its list for, seeded with the query at `createInitialValuePath`. */
const CreateForm = ({ schema, query, createInitialValuePath, createFieldMap, onSave, onCancel }: CreateFormProps) => (
  <FormRoot
    testId='create-referenced-object-form'
    schema={schema}
    defaultValues={createInitialValuePath ? { [createInitialValuePath]: query } : {}}
    fieldMap={createFieldMap}
    onSave={onSave}
    onCancel={onCancel}
  >
    <Next.Container gutter='inset'>
      <FormContent>
        <FormFields />
        <FormActions />
      </FormContent>
    </Next.Container>
  </FormRoot>
);

export type ObjectPickerProps = PickerBaseProps & {
  /** The selected option's id. */
  value?: string;
  placeholder?: string;
  /** Called with the picked id, or `undefined` when the selected option is picked again. */
  onSelect: (id: string | undefined) => void;
};

/**
 * Picks one object with `Next.Combobox` in trigger mode: a button showing the selection opens a popup whose search
 * field narrows the options (each with its description). Choosing the create row swaps the list for a create form.
 */
export const ObjectPicker = ({
  value,
  placeholder,
  loading,
  createSchema,
  createInitialValuePath,
  createFieldMap,
  createLabel,
  createIcon,
  onCreate,
  onSelect,
  options,
}: ObjectPickerProps) => {
  const { setOpen, creating, setCreating, items, open, handleOpenChange, startCreate } = usePickerState({
    options,
    createSchema,
    onCreate,
  });
  const handleSave = useCallback(
    async (values: any) => {
      await onCreate?.(values);
      setCreating(undefined);
      setOpen(false);
    },
    [onCreate],
  );

  return (
    <Next.Combobox.Root
      items={items}
      loading={loading}
      open={open}
      onOpenChange={handleOpenChange}
      value={value ? [value] : []}
      onSelect={({ itemValue }) => {
        if (options.some((option) => option.id === itemValue)) {
          onSelect(itemValue === value ? undefined : itemValue);
        }
      }}
      onCreate={startCreate}
      createLabel={createLabel}
      createIcon={createIcon}
    >
      <Next.Combobox.Trigger placeholder={placeholder} />
      <Next.Combobox.Content>
        {creating !== undefined && createSchema ? (
          <CreateForm
            schema={createSchema}
            query={creating}
            createInitialValuePath={createInitialValuePath}
            createFieldMap={createFieldMap}
            onSave={handleSave}
            onCancel={() => setCreating(undefined)}
          />
        ) : undefined}
      </Next.Combobox.Content>
    </Next.Combobox.Root>
  );
};

export type ObjectMultiPickerProps = Omit<PickerBaseProps, 'onCreate'> & {
  /** The selected options' ids, in order. */
  'value': string[];
  /** Shown in place of chips while nothing is selected. */
  'placeholder'?: string;
  'data-testid'?: string;
  'onValueChange': (ids: string[]) => void;
  /** Persists the create form's values and returns the new option's id, which is then selected. */
  'onCreate'?: (values: any) => Promise<string | undefined>;
};

/**
 * Picks several objects with `Next.Combobox` in `multiple` mode: the selection is a wrapping row of removable
 * `Next.Tag` chips (in each option's hue) whose caret opens a search popup; picking toggles an option and keeps the
 * popup open, and the create row swaps the list for a create form whose new object joins the selection.
 */
export const ObjectMultiPicker = ({
  value,
  placeholder,
  loading,
  createSchema,
  createInitialValuePath,
  createFieldMap,
  createLabel,
  createIcon,
  onCreate,
  onValueChange,
  options,
  'data-testid': testId,
}: ObjectMultiPickerProps) => {
  const { creating, setCreating, items, open, handleOpenChange, startCreate } = usePickerState({
    options,
    createSchema,
    onCreate,
  });
  const handleSave = useCallback(
    async (values: any) => {
      const id = await onCreate?.(values);
      if (id) {
        onValueChange([...value, id]);
      }
      setCreating(undefined);
    },
    [onCreate, onValueChange, value],
  );

  const selected = value.map((id) => options.find((option) => option.id === id) ?? { id, label: id });
  return (
    <Next.Combobox.Root
      items={items}
      loading={loading}
      multiple
      closeOnSelect={false}
      open={open}
      onOpenChange={handleOpenChange}
      value={value}
      onValueChange={({ value }) => onValueChange(value)}
      onCreate={startCreate}
      createLabel={createLabel}
      createIcon={createIcon}
    >
      <Next.Combobox.Control wrap data-testid={testId}>
        {selected.length === 0 && placeholder && <Next.Typography tone='description'>{placeholder}</Next.Typography>}
        {selected.map((option) => (
          <Next.Tag
            key={option.id}
            hue={hues.find((hue) => hue === option.hue)}
            onDelete={() => onValueChange(value.filter((id) => id !== option.id))}
          >
            {option.label}
          </Next.Tag>
        ))}
        <Next.Combobox.Trigger />
      </Next.Combobox.Control>
      <Next.Combobox.Content>
        {creating !== undefined && createSchema ? (
          <CreateForm
            schema={createSchema}
            query={creating}
            createInitialValuePath={createInitialValuePath}
            createFieldMap={createFieldMap}
            onSave={handleSave}
            onCancel={() => setCreating(undefined)}
          />
        ) : (
          <>
            <Next.Combobox.Input />
            <Next.Combobox.List />
          </>
        )}
      </Next.Combobox.Content>
    </Next.Combobox.Root>
  );
};
