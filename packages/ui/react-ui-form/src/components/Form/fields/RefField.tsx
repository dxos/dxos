//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Annotation, Ref, Type } from '@dxos/echo';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';
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
  array?: boolean;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  createSchema?: Schema.Schema.AnyNoContext;
  createInitialValuePath?: string;
  onCreate?: (values: any) => void;
  onQueryRefOptions?: QueryRefOptions;
};

export const RefField = (props: RefFieldProps) => {
  const {
    ast,
    label,
    inline,
    readonly,
    placeholder,
    getStatus,
    getValue,
    array,
    createOptionLabel,
    createOptionIcon,
    createSchema,
    createInitialValuePath,
    onCreate,
    onQueryRefOptions,
    onValueChange,
  } = props;
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();

  const typename = useMemo(
    () => (ast ? findAnnotation<ReferenceAnnotationValue>(ast, ReferenceAnnotationId)?.typename : undefined),
    [ast],
  );

  // TODO(burdon): Query items on demand.
  const { options, update: updateOptions } = useQueryRefOptions({ typename, onQueryRefOptions });

  // If ref type is expando, fall back to taking a DXN in string format.
  // TODO(burdon): Why?
  if (typename === Annotation.getTypeAnnotation(Type.Expando)?.typename || !onQueryRefOptions) {
    return <RefFieldFallback {...props} />;
  }

  const handleGetValue = useCallback(() => {
    const formValue = getValue();

    const unknownToRefOption = (value: unknown) => {
      const isRef = Ref.isRef(value);
      if (isRef || isRefSnapShot(value)) {
        const dxnString = isRef ? value.dxn.toString() : value['/'];
        const matchingOption = options.find((option) => option.id === dxnString);
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
  }, [options, array, getValue]);

  const handleUpdate = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        onValueChange('object', undefined);
        return;
      }

      const refs = ids
        .map((id) => {
          const item = options.find((option) => option.id === id);
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
    [options, array, onValueChange],
  );

  const handleCreate = useCallback(
    (values: any) => {
      onCreate?.(values);
      updateOptions();
    },
    [onCreate, updateOptions],
  );

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

  if (!typename || (readonly && items.length < 1)) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      <div>
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
            <ObjectPicker.Trigger asChild classNames='p-0'>
              {items?.length === 1 ? (
                <div className='flex gap-2 is-full'>
                  {items?.map((item) => (
                    <Input.Root key={item.id}>
                      <Input.TextInput value={item.label} readOnly classNames='is-full' />
                    </Input.Root>
                  ))}
                </div>
              ) : (
                <Button classNames='is-full text-start gap-2'>
                  <div role='none' className='grow overflow-hidden'>
                    <span className='flex truncate text-description'>
                      {placeholder ?? t('ref field placeholder', { count: array ? 99 : 1 })}
                    </span>
                  </div>
                  <Icon size={3} icon='ph--caret-down--bold' />
                </Button>
              )}
            </ObjectPicker.Trigger>
            <ObjectPicker.Content
              classNames='popover-card-width'
              options={options}
              selectedIds={selectedIds}
              createSchema={createSchema}
              createOptionLabel={createOptionLabel}
              createOptionIcon={createOptionIcon}
              createInitialValuePath={createInitialValuePath}
              onCreate={handleCreate}
              onSelect={toggleSelect}
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
