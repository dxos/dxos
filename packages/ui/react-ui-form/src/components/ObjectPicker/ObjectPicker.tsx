//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, forwardRef, useCallback, useState } from 'react';

import { Popover, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Combobox } from '@dxos/react-ui-list';
import { useSearchListResults } from '@dxos/react-ui-search';

import { translationKey } from '#translations';
import { type CreateOptions, type RefOption } from '#types';

import { Form } from '../Form';

export type ObjectPickerContentProps = ThemedClassName<
  CreateOptions & {
    options: RefOption[];
    selectedIds?: string[];
    createSchema?: Schema.Schema.AnyNoContext;
    /**
     * Persist a newly-created object given the form values. May be async (e.g.
     * to write to a database). The Promise is awaited before the inline create
     * form is collapsed back to the picker list, so consumers can complete
     * follow-up work (assign the new ref to a parent slot, close the popover)
     * before the picker UI re-renders.
     */
    onCreate?: (values: any) => unknown | Promise<unknown>;
    onSelect?: (id: string) => void;
  }
>;

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

    const { results, query, handleSearch } = useSearchListResults({
      items: options,
    });

    const handleFormSave = useCallback(
      async (values: any) => {
        await onCreate?.(values);
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
        <Combobox.Content {...props} onKeyDownCapture={handleKeyDown} ref={forwardedRef}>
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
      <Combobox.Content {...props} onKeyDownCapture={handleKeyDown} ref={forwardedRef}>
        <Combobox.Input
          placeholder={t('ref-field-combobox-input.placeholder')}
          autoFocus
          value={query}
          onValueChange={handleSearch}
        />
        <Combobox.List>
          {results.map((option) => (
            <Combobox.Item
              key={option.id}
              value={option.id}
              label={option.label}
              description={option.description}
              checked={selectedIds?.includes(option.id)}
              onSelect={() => onSelect?.(option.id)}
              classNames='flex items-center gap-2'
            />
          ))}
          {createSchema && onCreate && (
            <CreateItem
              query={query}
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon ?? 'ph--plus--regular'}
              onCreateItemSelect={(currentQuery: string) => {
                setFormInitialValue(currentQuery);
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
  query,
  createOptionLabel,
  createOptionIcon,
  onCreateItemSelect,
}: {
  query: string;
  createOptionLabel?: [string, { ns: string | readonly string[] }];
  createOptionIcon: string;
  onCreateItemSelect: (query: string) => void;
}) => {
  const { t } = useTranslation(translationKey);

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
