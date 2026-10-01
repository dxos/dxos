//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Next } from '@dxos/react-ui/next';

import { type CreateOptions, type RefOption } from '#types';

// The parts, not the `Form` namespace: RefField renders this picker inside the Form's module cycle, and the namespace
// object reads every part when its module is evaluated.
import { FormRoot } from '../components/Form/FormControls.tsx';
import { FormActions, FormContent } from './Form.tsx';
import { FormFields } from './FormFieldDispatch.tsx';

export type ObjectPickerProps = Pick<CreateOptions, 'createInitialValuePath' | 'createFieldMap'> & {
  options: RefOption[];
  /** The selected option's id. */
  value?: string;
  placeholder?: string;
  loading?: boolean;
  /** The inline create form's schema; with `onCreate`, the popup offers a create row for an unmatched query. */
  createSchema?: Schema.Codec<any, any>;
  /** Persists the create form's values; awaited before the popup closes. */
  onCreate?: (values: any) => unknown | Promise<unknown>;
  /** Called with the picked id, or `undefined` when the selected option is picked again. */
  onSelect: (id: string | undefined) => void;
};

/**
 * Picks one object with `Next.Combobox` in trigger mode: a button showing the selection opens a popup whose search
 * field narrows the options (each with its description). Choosing the create row swaps the list for a create form,
 * seeded with the query at `createInitialValuePath`.
 */
export const ObjectPicker = ({
  options,
  value,
  placeholder,
  loading,
  createSchema,
  createInitialValuePath,
  createFieldMap,
  onCreate,
  onSelect,
}: ObjectPickerProps) => {
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

  const handleCreate = useCallback(
    async (values: any) => {
      await onCreate?.(values);
      setCreating(undefined);
      setOpen(false);
    },
    [onCreate],
  );

  const canCreate = createSchema !== undefined && onCreate !== undefined;
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
      onCreate={
        canCreate
          ? (query) => {
              // The create row's selection has already asked the popup to close; this batch reopens it on the form.
              setCreating(query);
              setOpen(true);
            }
          : undefined
      }
    >
      <Next.Combobox.Trigger placeholder={placeholder} />
      <Next.Combobox.Content>
        {creating !== undefined && createSchema ? (
          <FormRoot
            testId='create-referenced-object-form'
            schema={createSchema}
            defaultValues={createInitialValuePath ? { [createInitialValuePath]: creating } : {}}
            fieldMap={createFieldMap}
            onSave={handleCreate}
            onCancel={() => setCreating(undefined)}
          >
            <Next.Container gutter='inset'>
              <FormContent>
                <FormFields />
                <FormActions />
              </FormContent>
            </Next.Container>
          </FormRoot>
        ) : undefined}
      </Next.Combobox.Content>
    </Next.Combobox.Root>
  );
};
