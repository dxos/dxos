//
// Copyright 2025 DXOS.org
//

import { type SchemaAST } from 'effect';
import React, { useCallback, useMemo, type FocusEvent } from 'react';

import {
  Expando,
  getTypeAnnotation,
  Ref,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxRefTag } from '@dxos/lit-ui/react';
import { Input, useTranslation } from '@dxos/react-ui';
import { TagPicker, type TagPickerMode, type TagPickerItemData } from '@dxos/react-ui-tag-picker';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { TextInput } from './Defaults';
import { InputHeader, type InputProps } from './Input';
import { type QueryRefOptions, useQueryRefOptions } from '../../hooks';
import { translationKey } from '../../translations';

type RefFieldProps = InputProps & {
  ast?: SchemaAST.AST;
  array?: boolean;
  onQueryRefOptions?: QueryRefOptions;
};

export const RefField = ({
  type,
  label,
  disabled,
  placeholder,
  inputOnly,
  array,
  ast,
  getValue,
  onBlur,
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

  if ((refTypeInfo && refTypeInfo?.typename === getTypeAnnotation(Expando)?.typename) || !onQueryRefOptions) {
    // If ref type is expando, fall back to taking a DXN in string format.
    return (
      <RefFieldFallback
        {...{ type, label, placeholder, disabled, inputOnly, getValue, onBlur, onValueChange, ...restInputProps }}
      />
    );
  }

  const handleGetValue = useCallback((): TagPickerItemData[] => {
    const formValue = getValue();

    const unknownToRefOption = (val: unknown) => {
      if (Ref.isRef(val)) {
        const dxnString = val.dxn.toString();
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

  const handleSearch = useCallback(
    (text: string, ids: string[]): TagPickerItemData[] =>
      availableOptions
        .filter((option) => !ids.includes(option.id))
        .filter((option) => option.label.toLowerCase().includes(text.toLowerCase()))
        .map((option) => ({ id: option.id, label: option.label, hue: option.hue as any })),
    [availableOptions],
  );

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

  const tagPickerMode: TagPickerMode = useMemo(() => (array ? 'multi-select' : 'single-select'), [array]);

  if (!refTypeInfo) {
    return null;
  }

  const { status, error } = restInputProps.getStatus();

  const items = handleGetValue();

  // NOTE(thure): I left both predicates in-place in case we decide to add variants which do render readonly but empty values.
  return disabled && items.length < 1 ? null : (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      <div data-no-submit>
        {disabled ? (
          items.length < 1 ? (
            <p className={mx(descriptionText, 'mbe-2')}>{t('empty readonly ref field label')}</p>
          ) : (
            items.map((item) => (
              <DxRefTag key={item.id} refid={item.id} rootclassname='mie-1' style={{ marginInlineEnd: '.25rem' }}>
                {item.label}
              </DxRefTag>
            ))
          )
        ) : (
          <TagPicker
            readonly={disabled}
            items={items}
            mode={tagPickerMode}
            onBlur={(event) => onBlur(event as unknown as FocusEvent<HTMLElement>)}
            onUpdate={handleUpdate}
            onSearch={handleSearch}
            classNames='rounded-sm bg-inputSurface p-1.5'
          />
        )}
      </div>
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

const RefFieldFallback = ({
  type,
  label,
  disabled,
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
      disabled={disabled}
      placeholder={placeholder}
      inputOnly={inputOnly}
      getValue={handleGetValue as <V>() => V | undefined}
      onValueChange={handleOnValueChange}
      {...restInputProps}
    />
  );
};
