//
// Copyright 2025 DXOS.org
//

import { type SchemaAST } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import {
  Expando,
  Ref,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  type TypeAnnotation,
  getTypeAnnotation,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { DxRefTag } from '@dxos/lit-ui/react';
import { Icon, Input, useTranslation } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';
import { TagPickerItem } from '@dxos/react-ui-tag-picker';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { type MaybePromise, isNonNullable } from '@dxos/util';

import { type QueryRefOptions, useQueryRefOptions } from '../../hooks';
import { translationKey } from '../../translations';

import { TextInput } from './Defaults';
import { InputHeader, type InputProps } from './Input';

type RefFieldProps = InputProps & {
  ast?: SchemaAST.AST;
  array?: boolean;
  onQueryRefOptions?: QueryRefOptions;
  createOptionLabel?: [string, { ns: string }];
  createOptionIcon?: string;
  onCreateFromQuery?: (type: TypeAnnotation, query: string) => MaybePromise<void>;
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
  createOptionLabel,
  createOptionIcon,
  onCreateFromQuery,
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

  const handleGetValue = useCallback(() => {
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
    () => Object.fromEntries(availableOptions.map((o) => [o.id, o.label ?? o.id])),
    [availableOptions],
  );
  const [query, setQuery] = useState('');
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
          <PopoverCombobox.Root placeholder={placeholder ?? t('empty readonly ref field label')}>
            <PopoverCombobox.Trigger
              classNames='bg-inputSurface p-1.5 rounded-sm w-full justify-between'
              onBlur={onBlur}
            >
              {items?.map((item) => (
                <TagPickerItem
                  key={item.id}
                  itemId={item.id}
                  label={item.label}
                  {...(item.hue ? { hue: item.hue } : {})}
                  removeLabel={t('remove item label')}
                  onItemClick={() => {
                    toggleSelect(item.id);
                  }}
                />
              ))}
            </PopoverCombobox.Trigger>
            <PopoverCombobox.Content
              filter={(value, search) => (labelById[value]?.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
            >
              <PopoverCombobox.Input
                placeholder={'Search...'}
                value={query}
                onValueChange={(v) => setQuery(v)}
                autoFocus
              />
              <PopoverCombobox.List constrainInline constrainBlock>
                {availableOptions.map((option) => (
                  <PopoverCombobox.Item key={option.id} value={option.id} onSelect={() => toggleSelect(option.id)}>
                    {option.label}
                  </PopoverCombobox.Item>
                ))}
                {query.length > 0 && createOptionLabel && createOptionIcon && onCreateFromQuery && (
                  <PopoverCombobox.Item
                    key='__create__'
                    onSelect={() => {
                      void onCreateFromQuery?.(refTypeInfo, query);
                    }}
                    classNames='inline-flex items-center gap-2'
                  >
                    <Icon icon={createOptionIcon} />
                    {t(createOptionLabel[0], { ns: createOptionLabel[1].ns, text: query })}
                  </PopoverCombobox.Item>
                )}
              </PopoverCombobox.List>
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
