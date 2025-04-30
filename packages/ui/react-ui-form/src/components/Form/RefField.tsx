//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  type AST,
  Expando,
  getReferenceAnnotation,
  getTypeAnnotation,
  S,
  type TypeAnnotation,
} from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { refFromDXN, RefImpl } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { SelectInput, TextInput } from './Defaults';
import { type FormInputStateProps } from './FormContext';

export type QueryRefOptions = (type: TypeAnnotation) => MaybePromise<{ dxn: DXN; label?: string }[]>;

type RefFieldProps = {
  ast: AST.AST;
  type: SimpleType;
  label: string;
  readonly?: boolean;
  placeholder?: string;
  inline?: boolean;
  onQueryRefOptions?: QueryRefOptions;
  inputProps: FormInputStateProps;
};

export const RefField = ({
  ast,
  type,
  label,
  readonly,
  placeholder,
  inline,
  onQueryRefOptions,
  inputProps,
}: RefFieldProps) => {
  const { getValue, onValueChange, ...restInputProps } = inputProps;
  const refTypeInfo = getReferenceAnnotation(S.make(ast));
  const [refOptions, setRefOptions] = useState<Array<{ value: string; label?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!refTypeInfo || !onQueryRefOptions) {
      return;
    }

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const options = await onQueryRefOptions(refTypeInfo);
        setRefOptions(
          options.map((option) => ({
            label: option.label,
            value: option.dxn.toString(),
          })),
        );
      } catch (error) {
        log.error('Failed to fetch ref options:', error);
        setRefOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOptions();
  }, [refTypeInfo, onQueryRefOptions]);

  if (!refTypeInfo) {
    return null;
  }

  // If ref type is expando, fall back to taking a DXN in string format.
  if (refTypeInfo.typename === getTypeAnnotation(Expando)?.typename || !onQueryRefOptions) {
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
      if (formValue instanceof RefImpl) {
        return formValue.dxn.toString();
      }

      return undefined;
    };

    return (
      <TextInput
        type={type}
        label={label}
        disabled={readonly}
        placeholder={placeholder}
        inputOnly={inline}
        getValue={handleGetValue as <V>() => V | undefined}
        onValueChange={handleOnValueChange}
        {...restInputProps}
      />
    );
  }

  const handleGetValue = () => {
    const formValue = getValue();

    if (formValue instanceof RefImpl) {
      return formValue.dxn.toString();
    }

    return undefined;
  };

  const handleValueChanged = (_type: any, dxnString: string) => {
    const dxn = DXN.parse(dxnString);
    const ref = refFromDXN(dxn);

    onValueChange('object', ref);
  };

  return (
    <SelectInput
      type={type}
      label={label}
      disabled={readonly || loading}
      placeholder={loading ? 'Loading options...' : placeholder}
      inputOnly={inline}
      getValue={handleGetValue as <V>() => V | undefined}
      onValueChange={handleValueChanged}
      options={refOptions}
      {...restInputProps}
    />
  );
};
