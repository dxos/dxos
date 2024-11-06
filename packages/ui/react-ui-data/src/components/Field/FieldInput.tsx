//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select } from '@dxos/react-ui';

import { type FormResult } from '../../hooks';

export type FieldInputProps<T> = {
  property: keyof T;
  label: string;
  options?: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  getInputProps: (field: keyof T, type?: 'select') => Record<string, any>;
} & Pick<FormResult<T>, 'getErrorValence' | 'getErrorMessage'>;

// TODO(burdon): Create story.
export const FieldInput = <T,>({
  property,
  label,
  options = [],
  disabled,
  placeholder,
  getInputProps,
  getErrorValence,
  getErrorMessage,
}: FieldInputProps<T>) => {
  const validationValence = getErrorValence(property);
  const errorMessage = getErrorMessage(property);

  if (options) {
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Select.Root {...getInputProps(property, 'select')}>
          <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {options.map(({ value, label }) => (
                  <Select.Option key={String(value)} value={String(value)}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Input.DescriptionAndValidation>
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  } else {
    // TODO(burdon): Restrict string pattern. Input masking based on schema?
    // TODO(burdon): Checkbox.
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.TextInput type='string' disabled={disabled} placeholder={placeholder} {...getInputProps(property)} />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }
};
