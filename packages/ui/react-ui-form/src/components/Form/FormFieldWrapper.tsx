//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from './FormFieldComponent';

export type FormFieldWrapperProps<T = any> = Pick<
  FormFieldComponentProps,
  'inline' | 'readonly' | 'label' | 'getStatus' | 'getValue'
> & {
  Component: FC<{ value: T }>;
};

export const FormFieldWrapper = <T = any,>({
  Component,
  inline,
  readonly,
  label,
  getStatus,
  getValue,
}: FormFieldWrapperProps<T>) => {
  const { status, error } = getStatus();
  const value = getValue();
  if (readonly && value == null) {
    return null;
  }

  const str = String(value ?? '');
  if (readonly === 'static' && inline) {
    return <p>{str}</p>;
  }

  return (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      {readonly === 'static' ? <p>{str}</p> : <Component value={value} />}
      {!inline && (
        <Input.DescriptionAndValidation>
          <Input.Validation>{error}</Input.Validation>
        </Input.DescriptionAndValidation>
      )}
    </Input.Root>
  );
};
