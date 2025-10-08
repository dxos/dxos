//
// Copyright 2025 DXOS.org
//

import { type Schema, type SchemaAST } from 'effect';
import React, { type KeyboardEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import {
  type EchoSchema,
  Expando,
  Ref,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  getTypeAnnotation,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { type DxTagPickerItemClick } from '@dxos/lit-ui';
import { DxAnchor, DxTagPickerItem } from '@dxos/lit-ui/react';
import { Button, Icon, Input, Popover, useTranslation } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions, useQueryRefOptions } from '../../hooks';
import { translationKey } from '../../translations';

import { TextInput } from './Defaults';
import { Form } from './Form';
import { InputHeader, type InputProps } from './Input';

export type RefFieldProps = InputProps & {
  ast?: SchemaAST.AST;
  array?: boolean;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  onCreate?: (values: any) => void;
  createSchema?: Schema.Schema.AnyNoContext;
  createInitialValuePath?: string;
  onQueryRefOptions?: QueryRefOptions;
  schema?: EchoSchema;
};

// TODO(thure): Is this a standard that should be better canonized?
const isRefSnapShot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

export const RefField = ({
  type,
  label,
  readonly,
  placeholder,
  inputOnly,
  array,
  ast,
  getValue,
  createOptionLabel,
  createOptionIcon,
  onBlur,
  onCreate,
  createSchema,
  createInitialValuePath,
  onQueryRefOptions,
  onValueChange,
  ...restInputProps
}: RefFieldProps) => {
  const { t } = useTranslation(translationKey);
  const refTypeInfo = useMemo(
    () => (ast ? findAnnotation<ReferenceAnnotationValue>(ast, ReferenceAnnotationId) : undefined),
    [ast],
  );
  const { options: availableOptions, loading: _loading } = useQueryRefOptions({ refTypeInfo, onQueryRefOptions });

  const [showForm, setShowForm] = useState(false);
  const [searchString, setSearchString] = useState('');

  const handleFormSave = useCallback(
    (values: any) => {
      onCreate?.(values);
      setShowForm(false);
      setSearchString('');
    },
    [refTypeInfo, onCreate],
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

  if ((refTypeInfo && refTypeInfo?.typename === getTypeAnnotation(Expando)?.typename) || !onQueryRefOptions) {
    // If ref type is expando, fall back to taking a DXN in string format.
    return (
      <RefFieldFallback
        {...{ type, label, placeholder, readonly, inputOnly, getValue, onBlur, onValueChange, ...restInputProps }}
      />
    );
  }

  const handleGetValue = useCallback(() => {
    const formValue = getValue();

    const unknownToRefOption = (val: unknown) => {
      const isRef = Ref.isRef(val);
      if (isRef || isRefSnapShot(val)) {
        const dxnString = isRef ? val.dxn.toString() : val['/'];
        const matchingOption = availableOptions.find((option) => option.id === dxnString);
        if (matchingOption) {
          return matchingOption;
        }
      }
      return undefined;
    };

    if (array && Array.isArray(formValue)) {
      return formValue.map(unknownToRefOption).filter(isNonNullable) ?? [];
    }

    const option = unknownToRefOption(formValue);
    if (option) {
      return [option];
    }

    return [];
  }, [getValue, availableOptions, array]);

  const handleUpdate = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        onValueChange('object', undefined);
        return;
      }

      const refs = ids
        .map((id) => {
          const item = availableOptions.find((option) => option.id === id);
          if (item) {
            const dxn = DXN.parse(item.id);
            return Ref.fromDXN(dxn);
          }
          return null;
        })
        .filter(isNonNullable);

      if (array) {
        onValueChange('object', refs);
      } else {
        onValueChange('object', refs[0]);
      }
    },
    [availableOptions, array, onValueChange],
  );

  if (!refTypeInfo) {
    return null;
  }

  const { status, error } = restInputProps.getStatus();

  const items = handleGetValue();
  const selectedIds = useMemo(() => items.map((i: any) => i.id), [items]);
  const labelById = useMemo(
    () =>
      availableOptions.reduce((acc: Record<string, string>, option) => {
        acc[option.id.toLowerCase()] = option.label.toLowerCase();
        return acc;
      }, {}),
    [availableOptions],
  );
  const toggleSelect = useCallback(
    (id: string) => {
      if (array) {
        const nextIds = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
        handleUpdate(nextIds);
      } else {
        if (selectedIds[0] === id) {
          handleUpdate([]);
        } else {
          handleUpdate([id]);
        }
      }
    },
    [array, selectedIds, handleUpdate],
  );

  // NOTE(thure): I left both predicates in-place in case we decide to add variants which do render readonly but empty values.
  return readonly && items.length < 1 ? null : (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      <div data-no-submit>
        {readonly ? (
          items.length < 1 ? (
            <p className={mx(descriptionText, 'mbe-2')}>{t('empty readonly ref field label')}</p>
          ) : (
            items.map((item) => (
              <DxAnchor key={item.id} refid={item.id} rootclassname='mie-1'>
                {item.label}
              </DxAnchor>
            ))
          )
        ) : (
          <PopoverCombobox.Root>
            <PopoverCombobox.Trigger asChild>
              <Button variant='ghost' classNames='is-full text-start gap-2'>
                <div role='none' className='grow'>
                  {items?.length ? (
                    items?.map((item) => (
                      <DxTagPickerItem
                        key={item.id}
                        itemId={item.id}
                        label={item.label}
                        {...(item.hue ? { hue: item.hue } : {})}
                        removeLabel={t('remove item label')}
                        onItemClick={(event: DxTagPickerItemClick) => {
                          if (event.action === 'remove') {
                            toggleSelect(item.id);
                          }
                        }}
                      />
                    ))
                  ) : (
                    <span className='text-description'>
                      {placeholder ?? t('ref field placeholder', { count: array ? 99 : 1 })}
                    </span>
                  )}
                </div>
                <Icon size={3} icon='ph--caret-down--bold' />
              </Button>
            </PopoverCombobox.Trigger>
            <PopoverCombobox.Content
              filter={(value, search) =>
                value === '__create__' || labelById[value]?.includes(search.toLowerCase()) ? 1 : 0
              }
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
                    onValueChange={(v) => setSearchString(v)}
                    autoFocus
                  />
                  <PopoverCombobox.List>
                    {availableOptions.map((option) => (
                      <PopoverCombobox.Item
                        key={option.id}
                        value={option.id}
                        onSelect={() => toggleSelect(option.id)}
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
          </PopoverCombobox.Root>
        )}
      </div>
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

const RefFieldFallback = ({
  type,
  label,
  readonly,
  placeholder,
  inputOnly,
  getValue,
  onValueChange,
  ...restInputProps
}: InputProps) => {
  const handleOnValueChange = (_type: any, dxnString: string) => {
    const dxn = DXN.tryParse(dxnString);
    if (dxn) {
      onValueChange?.('object', Ref.fromDXN(dxn));
    } else if (dxnString === '') {
      onValueChange?.('object', undefined);
    } else {
      onValueChange?.('string', dxnString);
    }
  };

  const handleGetValue = () => {
    const formValue = getValue();
    if (typeof formValue === 'string') {
      return formValue;
    }
    if (Ref.isRef(formValue)) {
      return formValue.dxn.toString();
    }

    return undefined;
  };

  return (
    <TextInput
      type={type}
      label={label}
      readonly={readonly}
      placeholder={placeholder}
      inputOnly={inputOnly}
      getValue={handleGetValue as <V>() => V | undefined}
      onValueChange={handleOnValueChange}
      {...restInputProps}
    />
  );
};
