//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useMemo } from 'react';

import {
  type EchoSchema,
  Expando,
  Ref,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  getTypeAnnotation,
} from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { type DxTagPickerItemClick } from '@dxos/lit-ui';
import { DxAnchor, DxTagPickerItem } from '@dxos/lit-ui/react';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions, useQueryRefOptions } from '../../../hooks';
import { translationKey } from '../../../translations';
import { ObjectPicker } from '../../ObjectPicker';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

import { TextField } from './TextField';

// TODO(thure): Is this a standard that should be better canonized?
const isRefSnapShot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

export type RefFieldProps = FormFieldComponentProps & {
  schema?: EchoSchema;
  ast?: SchemaAST.AST;
  array?: boolean;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createSchema?: Schema.Schema.AnyNoContext;
  createInitialValuePath?: string;
  onCreate?: (values: any) => void;
  onQueryRefOptions?: QueryRefOptions;
};

export const RefField = ({
  type,
  label,
  inline,
  readonly,
  placeholder,
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
  const {
    options: availableOptions,
    update: updateOptions,
    loading: _loading,
  } = useQueryRefOptions({ refTypeInfo, onQueryRefOptions });

  if ((refTypeInfo && refTypeInfo?.typename === getTypeAnnotation(Expando)?.typename) || !onQueryRefOptions) {
    // If ref type is expando, fall back to taking a DXN in string format.
    return (
      <RefFieldFallback
        {...{ type, label, placeholder, readonly, inline, getValue, onBlur, onValueChange, ...restInputProps }}
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

  const handleCreate = useCallback(
    (values: any) => {
      onCreate?.(values);
      updateOptions();
    },
    [onCreate, updateOptions],
  );

  if (!refTypeInfo) {
    return null;
  }

  const { status, error } = restInputProps.getStatus();

  const items = handleGetValue();
  const selectedIds = useMemo(() => items.map((i: any) => i.id), [items]);
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
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
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
          <ObjectPicker.Root>
            <ObjectPicker.Trigger asChild>
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
            </ObjectPicker.Trigger>
            <ObjectPicker.Content
              options={availableOptions}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              createSchema={createSchema}
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon}
              createInitialValuePath={createInitialValuePath}
              onCreate={handleCreate}
            />
          </ObjectPicker.Root>
        )}
      </div>
      {inline && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

const RefFieldFallback = ({
  type,
  label,
  inline,
  readonly,
  placeholder,
  getValue,
  onValueChange,
  ...restInputProps
}: FormFieldComponentProps) => {
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
    <TextField
      type={type}
      label={label}
      inline={inline}
      readonly={readonly}
      placeholder={placeholder}
      getValue={handleGetValue as <V>() => V | undefined}
      onValueChange={handleOnValueChange}
      {...restInputProps}
    />
  );
};
