//
// Copyright 2025 DXOS.org
//

import { type SchemaAST } from 'effect';
import React, { useEffect, useState } from 'react';

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
import { type MaybePromise } from '@dxos/util';

import { SelectInput, TextInput } from './Defaults';
import { type InputProps } from './Input';

export type QueryRefOptions = (type: TypeAnnotation) => MaybePromise<{ dxn: DXN; label?: string }[]>;

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
  }

  const handleGetValue = () => {
    const formValue = getValue();

    if (Ref.isRef(formValue)) {
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
      disabled={disabled || loading}
      placeholder={loading ? 'Loading options...' : placeholder}
      inputOnly={inputOnly}
      getValue={handleGetValue as <V>() => V | undefined}
      onValueChange={handleValueChanged}
      options={refOptions}
      {...restInputProps}
    />
  );
};
