//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useState } from 'react';

import { type Palette, Popover, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Combobox, useSearchListResults } from '@dxos/react-ui-searchlist';

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
    const [searchString, setSearchString] = useState('');

    const { results, handleSearch } = useSearchListResults({
      items: options,
    });

    const handleFormSave = useCallback(
      (values: any) => {
        onCreate?.(values);
        setShowForm(false);
        setSearchString('');
      },
      [onCreate],
    );

    const handleFormCancel = useCallback(() => {
      setShowForm(false);
      setSearchString('');
    }, []);

    // TODO(thure): The following click and keydown handlers are necessary because `onSelect` is called after the Popover is already closed.
    //  Augment/refactor CmdK, if possible, to facilitate stopping event defaultand propagation.

    const handleClick = useCallback(
      (event: MouseEvent) => {
        if (createSchema && (event.target as HTMLElement).closest('[data-value="__create__"]')) {
          event.stopPropagation();
          event.preventDefault();
          setShowForm(true);
        }
      },
      [createSchema],
    );

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
          setShowForm(true);
        }
      },
      [createSchema],
    );

    const handleSearchWithState = useCallback(
      (query: string) => {
        setSearchString(query);
        handleSearch(query);
      },
      [handleSearch],
    );

    return (
      <Combobox.Content
        {...props}
        ref={ref}
        value={searchString}
        onSearch={handleSearchWithState}
        onClickCapture={handleClick}
        onKeyDownCapture={handleKeyDown}
      >
        {showForm && createSchema ? (
          <Popover.Viewport>
            <Form.Root
              testId='create-referenced-object-form'
              schema={createSchema}
              values={createInitialValuePath ? { [createInitialValuePath]: searchString } : {}}
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
              {searchString.length > 0 && createOptionLabel && createOptionIcon && createSchema && onCreate && (
                <Combobox.Item
                  value='__create__'
                  label={t(createOptionLabel[0], { ns: createOptionLabel[1].ns, text: searchString })}
                  icon={createOptionIcon}
                  classNames='flex items-center gap-2'
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
