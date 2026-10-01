//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, {
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Next } from '@dxos/react-ui/next';
import { hues } from '@dxos/ui-types';
import { arrayMove } from '@dxos/util';

import { type CreateOptions, type RefOption } from '#types';

import { FormActions, FormContent } from './Form.tsx';
import { FormFields } from './FormFieldDispatch.tsx';
// The parts, not the `Form` namespace: RefField renders this picker inside the Form's module cycle, and the namespace
// object reads every part when its module is evaluated.
import { FormRoot } from './FormRoot.tsx';

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
  /** Replaces the selection button, e.g. a toolbar's add button that picks an object to insert. */
  trigger?: ReactElement;
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
  trigger,
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
      {trigger ? (
        <Next.Combobox.Trigger asChild>{trigger}</Next.Combobox.Trigger>
      ) : (
        <Next.Combobox.Trigger placeholder={placeholder} />
      )}
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
  /** Chips reorder by drag, or Alt+ArrowLeft/Right on a focused chip. */
  'ordered'?: boolean;
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
  ordered,
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
  const { chipProps } = useChipOrder({ value, onValueChange });
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
            {...(ordered && chipProps(option.id))}
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

type ChipOrderOptions = Pick<ObjectMultiPickerProps, 'value' | 'onValueChange'>;

/** The data attribute naming a chip's id, so focus can follow a moved chip. */
const CHIP_ID = 'data-chip-id';

/**
 * Reordering for a wrapping row of chips: each chip is a native drag source and drop target (dropping moves the dragged
 * chip to its place) and, focused, moves by Alt+ArrowLeft/Right, keeping focus as React moves its element.
 */
const useChipOrder = ({ value, onValueChange }: ChipOrderOptions) => {
  const [focusId, setFocusId] = useState<string>();
  const rowRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (focusId) {
      rowRef.current?.querySelector<HTMLElement>(`[${CHIP_ID}="${CSS.escape(focusId)}"]`)?.focus();
      setFocusId(undefined);
    }
  }, [focusId, value]);

  const move = (id: string, to: number) => {
    const from = value.indexOf(id);
    if (from < 0 || to < 0 || to >= value.length || from === to) {
      return;
    }
    const next = [...value];
    arrayMove(next, from, to);
    onValueChange(next);
  };

  const chipProps = (id: string) => ({
    [CHIP_ID]: id,
    'draggable': true,
    'tabIndex': 0,
    'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight',
    'onKeyDown': (event: KeyboardEvent<HTMLElement>) => {
      const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (event.altKey && step !== 0 && event.target === event.currentTarget) {
        event.preventDefault();
        rowRef.current = event.currentTarget.parentElement;
        move(id, value.indexOf(id) + step);
        setFocusId(id);
      }
    },
    'onDragStart': (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData(CHIP_MIME, id);
      event.dataTransfer.effectAllowed = 'move';
    },
    'onDragOver': (event: DragEvent<HTMLElement>) => {
      if (event.dataTransfer.types.includes(CHIP_MIME)) {
        event.preventDefault();
      }
    },
    'onDrop': (event: DragEvent<HTMLElement>) => {
      const dragged = event.dataTransfer.getData(CHIP_MIME);
      if (dragged) {
        event.preventDefault();
        move(dragged, value.indexOf(id));
      }
    },
  });

  return { chipProps };
};

/** The drag payload type of a chip, so a row only accepts its own chips. */
const CHIP_MIME = 'application/x-dxos-chip';
