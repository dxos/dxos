//
// Copyright 2025 DXOS.org
//

import { type SchemaAST } from 'effect';
import React, { useCallback, useEffect, useState } from 'react';

import {
  Expando,
  getTypeAnnotation,
  Ref,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  type TypeAnnotation,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { refFromDXN } from '@dxos/live-object';
import { log } from '@dxos/log';
import { Input } from '@dxos/react-ui';
import { TagPicker, type TagPickerItemData } from '@dxos/react-ui-tag-picker';
import { type MaybePromise } from '@dxos/util';

import { TextInput } from './Defaults';
import { InputHeader, type InputProps } from './Input';

export type RefOption = { dxn: DXN; label?: string };
export type QueryRefOptions = (type: TypeAnnotation) => MaybePromise<RefOption[]>;

// Using InputProps and adding the necessary props for RefField
type RefFieldProps = InputProps & {
  ast?: SchemaAST.AST;
  onQueryRefOptions?: QueryRefOptions;
};

export const RefField = ({
  type,
  label,
  disabled,
  placeholder,
  inputOnly,
  ast,
  onQueryRefOptions,
  getValue,
  onValueChange,
  ...restInputProps
}: RefFieldProps) => {
  // Using the ast that was passed in at call site
  const astNode = ast;
  if (!astNode) {
    return null;
  }

  const refTypeInfo = findAnnotation<ReferenceAnnotationValue>(astNode, ReferenceAnnotationId);
  const { options: availableOptions, loading: _loading } = useQueryRefOptions({ refTypeInfo, onQueryRefOptions });

  if (!refTypeInfo) {
    return null;
  }

  if (refTypeInfo.typename === getTypeAnnotation(Expando)?.typename || !onQueryRefOptions) {
    // If ref type is expando, fall back to taking a DXN in string format.
    return (
      <RefFieldFallback
        {...{ type, label, disabled, placeholder, inputOnly, getValue, onValueChange, ...restInputProps }}
      />
    );
  }

  const handleGetValue = (): TagPickerItemData[] => {
    const formValue = getValue();

    if (Ref.isRef(formValue)) {
      const dxnString = formValue.dxn.toString();
      const matchingOption = availableOptions.find((option) => option.id === dxnString);
      if (matchingOption) {
        return [matchingOption];
      }
    }

    return [];
  };

  const { status, error } = restInputProps.getStatus();

  const handleSearch = useCallback(
    (text: string, ids: string[]): TagPickerItemData[] =>
      availableOptions
        .filter((option) => !ids.includes(option.id))
        .filter((option) => option.label.toLowerCase().includes(text.toLowerCase()))
        .map((option) => ({ id: option.id, label: option.label, hue: option.hue as any })),
    [availableOptions],
  );

  const handleUpdate = (ids: string[]) => {
    if (ids.length === 0) {
      onValueChange('object', undefined);
    }
    const firstId = ids.at(0);
    const item = availableOptions.find((option) => option.id === firstId);
    if (item) {
      const dxn = DXN.parse(item.id);
      const ref = Ref.fromDXN(dxn);
      onValueChange('object', ref);
    }
  };

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <div data-no-submit>
        <TagPicker
          items={handleGetValue()}
          mode='single-select'
          onUpdate={handleUpdate}
          onSearch={handleSearch}
          classNames='rounded-sm bg-input p-1'
        />
      </div>
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

type UseQueryRefOptionsProps = { refTypeInfo: TypeAnnotation | undefined; onQueryRefOptions?: QueryRefOptions };

export const useQueryRefOptions = ({ refTypeInfo, onQueryRefOptions }: UseQueryRefOptionsProps) => {
  const [options, setOptions] = useState<TagPickerItemData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!refTypeInfo || !onQueryRefOptions) {
      return;
    }

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const fetchedOptions = await onQueryRefOptions(refTypeInfo);
        setOptions(
          fetchedOptions.map((option) => {
            const dxn = option.dxn.toString() as string;
            return { id: dxn, label: option.label ?? dxn, hue: 'neutral' as any };
          }),
        );
      } catch (error) {
        log.error('Failed to fetch ref options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOptions();
  }, [refTypeInfo, onQueryRefOptions]);

  return { options, loading };
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
      onValueChange?.('object', refFromDXN(dxn));
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
