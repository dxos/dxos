//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, forwardRef, useCallback, useState } from 'react';

import { type Palette, Popover, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Combobox, useSearchListInput, useSearchListResults } from '@dxos/react-ui-search';

import { translationKey } from '../../translations';
import { Form } from '../Form';
import { type FormFieldMap } from '../Form/FormFieldComponent';

export type RefOption = {
  id: string;
  label: string;
  hue?: Palette;
};

export type ObjectPickerContentProps = ThemedClassName<{
  options: RefOption[];
  selectedIds?: string[];
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createSchema?: Schema.Schema.AnyNoContext;
  createInitialValuePath?: string;
  createFieldMap?: FormFieldMap;
  onCreate?: (values: any) => void;
  onSelect: (id: string) => void;
}>;

const ObjectPickerContent = forwardRef<HTMLDivElement, ObjectPickerContentProps>(
  (
    {
      options,
      selectedIds,
      createSchema,
      createOptionLabel,
      createOptionIcon,
      createInitialValuePath,
      createFieldMap,
      onSelect,
      onCreate,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const [showForm, setShowForm] = useState(false);
    const [formInitialValue, setFormInitialValue] = useState<string>('');

    const { results, handleSearch } = useSearchListResults({
      items: options,
    });

    const handleFormSave = useCallback(
      (values: any) => {
        onCreate?.(values);
        setShowForm(false);
        setFormInitialValue('');
      },
      [onCreate],
    );

    const handleFormCancel = useCallback(() => {
      setShowForm(false);
      setFormInitialValue('');
    }, []);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (
          event.key === 'Enter' &&
          createSchema &&
          (event.currentTarget as HTMLElement).querySelector(
            '[role="option"][aria-selected="true"][data-value="__create__"]',
          )
        ) {
          event.stopPropagation();
          event.preventDefault();
          // Get the current query from the input element
          const input = (event.currentTarget as HTMLElement).querySelector('input[type="text"]') as HTMLInputElement;
          const currentQuery = input?.value || '';
          setFormInitialValue(currentQuery);
          setShowForm(true);
        }
      },
      [createSchema],
    );

    if (showForm && createSchema) {
      return (
        <Combobox.Content {...props} onSearch={handleSearch} onKeyDownCapture={handleKeyDown} ref={forwardedRef}>
          <Popover.Viewport>
            <Form.Root
              testId='create-referenced-object-form'
              schema={createSchema}
              defaultValues={createInitialValuePath ? { [createInitialValuePath]: formInitialValue } : {}}
              fieldMap={createFieldMap}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            >
              <Form.Viewport>
                <Form.Content>
                  <Form.FieldSet />
                  <Form.Actions />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </Popover.Viewport>
          <Combobox.Arrow />
        </Combobox.Content>
      );
    }

    return (
      <Combobox.Content {...props} onSearch={handleSearch} onKeyDownCapture={handleKeyDown} ref={forwardedRef}>
        <Combobox.Input placeholder={t('ref-field-combobox-input.placeholder')} autoFocus />
        <Combobox.List>
          {results.map((option) => (
            <Combobox.Item
              key={option.id}
              value={option.id}
              label={option.label}
              checked={selectedIds?.includes(option.id)}
              onSelect={() => onSelect(option.id)}
              classNames='flex items-center gap-2'
            />
          ))}
          {createSchema && onCreate && (
            <CreateItem
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon ?? 'ph--plus--regular'}
              onCreateItemSelect={(query: string) => {
                setFormInitialValue(query);
                setShowForm(true);
              }}
            />
          )}
        </Combobox.List>
        <Combobox.Arrow />
      </Combobox.Content>
    );
  },
);

const CreateItem = ({
  createOptionLabel,
  createOptionIcon,
  onCreateItemSelect,
}: {
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon: string;
  onCreateItemSelect: (query: string) => void;
}) => {
  const { t } = useTranslation(translationKey);
  const { query } = useSearchListInput();

  const label = createOptionLabel
    ? t(createOptionLabel[0], { ns: createOptionLabel[1].ns, text: query })
    : t('create-option.label');

  return (
    <Combobox.Item
      value='__create__'
      label={label}
      icon={createOptionIcon}
      classNames='flex items-center gap-2'
      closeOnSelect={false}
      onSelect={() => {
        onCreateItemSelect(query);
      }}
    />
  );
};

ObjectPickerContent.displayName = 'ObjectPicker.Content';

export const ObjectPicker = {
  Root: Combobox.Root,
  Portal: Combobox.Portal,
  Trigger: Combobox.Trigger,
  VirtualTrigger: Combobox.VirtualTrigger,
  Content: ObjectPickerContent,
};
