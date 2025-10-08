//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { type KeyboardEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';

import { type QueryTag } from '../../hooks';
import { translationKey } from '../../translations';
import { Form } from '../Form';

export type ObjectPickerContentProps = {
  options: QueryTag[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  createSchema?: Schema.Schema.AnyNoContext;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createInitialValuePath?: string;
  onCreate?: (values: any) => void;
};

const ObjectPickerContent = React.forwardRef<HTMLDivElement, ObjectPickerContentProps>(
  (
    {
      options,
      selectedIds,
      onSelect,
      createSchema,
      createOptionLabel,
      createOptionIcon,
      createInitialValuePath,
      onCreate,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation(translationKey);

    const [searchString, setSearchString] = useState('');
    const [showForm, setShowForm] = useState(false);

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
        options.reduce((acc: Record<string, string>, option) => {
          acc[option.id.toLowerCase()] = option.label.toLowerCase();
          return acc;
        }, {}),
      [options],
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
              onValueChange={setSearchString}
              autoFocus
            />
            <PopoverCombobox.List>
              {options.map((option) => (
                <PopoverCombobox.Item
                  key={option.id}
                  value={option.id}
                  onSelect={() => onSelect(option.id)}
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
