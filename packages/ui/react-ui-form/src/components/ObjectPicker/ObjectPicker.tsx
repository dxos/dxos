//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { type KeyboardEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { type ReferenceAnnotationValue } from '@dxos/echo-schema';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';

import { type QueryRefOptions, useQueryRefOptions } from '../../hooks';
import { translationKey } from '../../translations';
import { Form } from '../Form';

export type ObjectPickerContentProps = {
  refTypeInfo?: ReferenceAnnotationValue;
  onQueryRefOptions?: QueryRefOptions;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  searchString: string;
  onSearchStringChange: (value: string) => void;
  createSchema?: Schema.Schema.AnyNoContext;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createInitialValuePath?: string;
  onFormSave: (values: any) => void;
};

const ObjectPickerContent = React.forwardRef<HTMLDivElement, ObjectPickerContentProps>(
  (
    {
      refTypeInfo,
      onQueryRefOptions,
      selectedIds,
      onToggleSelect,
      searchString,
      onSearchStringChange,
      createSchema,
      createOptionLabel,
      createOptionIcon,
      createInitialValuePath,
      onFormSave,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation(translationKey);
    const { options: availableOptions } = useQueryRefOptions({ refTypeInfo, onQueryRefOptions });

    const [showForm, setShowForm] = useState(false);

    const handleFormSave = useCallback(
      (values: any) => {
        onFormSave(values);
        setShowForm(false);
        onSearchStringChange('');
      },
      [onFormSave, onSearchStringChange],
    );

    const handleFormCancel = useCallback(() => {
      setShowForm(false);
      onSearchStringChange('');
    }, [onSearchStringChange]);

    // TODO(thure): The following workarounds are necessary because `onSelect` is called after the Popover is already
    //  closed. Augment/refactor CmdK, if possible, to facilitate stopping event default & propagation.

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

    const labelById = useMemo(
      () =>
        availableOptions.reduce((acc: Record<string, string>, option) => {
          acc[option.id.toLowerCase()] = option.label.toLowerCase();
          return acc;
        }, {}),
      [availableOptions],
    );

    return (
      <PopoverCombobox.Content
        {...props}
        ref={ref}
        filter={(value, search) => (value === '__create__' || labelById[value]?.includes(search.toLowerCase()) ? 1 : 0)}
        onClickCapture={handleClick}
        onKeyDownCapture={handleKeyDown}
      >
        {showForm && createSchema ? (
          <Popover.Viewport>
            <Form
              schema={createSchema}
              values={createInitialValuePath ? { [createInitialValuePath]: searchString } : {}}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
              testId='create-referenced-object-form'
            />
          </Popover.Viewport>
        ) : (
          <>
            <PopoverCombobox.Input
              placeholder={t('ref field combobox input placeholder')}
              value={searchString}
              onValueChange={onSearchStringChange}
              autoFocus
            />
            <PopoverCombobox.List>
              {availableOptions.map((option) => (
                <PopoverCombobox.Item
                  key={option.id}
                  value={option.id}
                  onSelect={() => onToggleSelect(option.id)}
                  classNames='flex items-center gap-2'
                >
                  <span className='grow'>{option.label}</span>
                  {selectedIds.includes(option.id) && <Icon icon='ph--check--regular' />}
                </PopoverCombobox.Item>
              ))}
              {searchString.length > 0 && createOptionLabel && createOptionIcon && createSchema && (
                <PopoverCombobox.Item value='__create__' classNames='flex items-center gap-2'>
                  <Icon icon={createOptionIcon} />
                  {t(createOptionLabel[0], { ns: createOptionLabel[1].ns, text: searchString })}
                </PopoverCombobox.Item>
              )}
            </PopoverCombobox.List>
          </>
        )}
        <PopoverCombobox.Arrow />
      </PopoverCombobox.Content>
    );
  },
);

ObjectPickerContent.displayName = 'ObjectPickerContent';

export const ObjectPicker = {
  Root: PopoverCombobox.Root,
  Trigger: PopoverCombobox.Trigger,
  Content: ObjectPickerContent,
};
