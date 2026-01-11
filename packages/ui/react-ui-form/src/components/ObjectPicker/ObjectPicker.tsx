//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, forwardRef, useCallback, useState } from 'react';

import { type Palette, Popover, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Combobox, useSearchListInput, useSearchListResults } from '@dxos/react-ui-searchlist';

import { translationKey } from '../../translations';
import { Form } from '../Form';

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
  onCreate?: (values: any) => void;
  onSelect: (id: string) => void;
}>;

const CreateItem = ({
  createOptionLabel,
  createOptionIcon,
  onCreateItemSelect,
}: {
  createOptionLabel: [string, { ns: string }];
  createOptionIcon: string;
  onCreateItemSelect: (query: string) => void;
}) => {
  const { t } = useTranslation(translationKey);
  const { query } = useSearchListInput();

  return (
    <Combobox.Item
      value='__create__'
      label={t(createOptionLabel[0], { ns: createOptionLabel[1].ns, text: query })}
      icon={createOptionIcon}
      classNames='flex items-center gap-2'
      closeOnSelect={false}
      onSelect={() => {
        onCreateItemSelect(query);
      }}
    />
  );
};

const ObjectPickerContent = forwardRef<HTMLDivElement, ObjectPickerContentProps>(
  (
    {
      options,
      selectedIds,
      createSchema,
      createOptionLabel,
      createOptionIcon,
      createInitialValuePath,
      onSelect,
      onCreate,
      ...props
    },
    ref,
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

    return (
      <Combobox.Content
        {...props}
        ref={ref}
        onSearch={handleSearch}
        onKeyDownCapture={handleKeyDown}
      >
        {showForm && createSchema ? (
          <Popover.Viewport>
            <Form.Root
              testId='create-referenced-object-form'
              schema={createSchema}
              values={createInitialValuePath ? { [createInitialValuePath]: formInitialValue } : {}}
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
        ) : (
          <>
            <Combobox.Input placeholder={t('ref field combobox input placeholder')} autoFocus />
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
              {createOptionLabel && createOptionIcon && createSchema && onCreate && (
                <CreateItem
                  createOptionLabel={createOptionLabel}
                  createOptionIcon={createOptionIcon}
                  onCreateItemSelect={(query: string) => {
                    setFormInitialValue(query);
                    setShowForm(true);
                  }}
                />
              )}
            </Combobox.List>
          </>
        )}
        <Combobox.Arrow />
      </Combobox.Content>
    );
  },
);

ObjectPickerContent.displayName = 'ObjectPickerContent';

export const ObjectPicker = {
  Root: Combobox.Root,
  Trigger: Combobox.Trigger,
  VirtualTrigger: Combobox.VirtualTrigger,
  Content: ObjectPickerContent,
};
