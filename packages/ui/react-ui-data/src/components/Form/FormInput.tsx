//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select } from '@dxos/react-ui';

import { type FormResult } from '../../hooks';

type FormInputType = 'string' | 'number' | 'boolean';

export const isValidFormInput = (type?: string): type is FormInputType =>
  type ? ['string', 'number', 'boolean'].includes(type) : false;

export type FormInputProps<T extends object> = {
  property: keyof T;
  type: FormInputType;
  label: string;
  options?: Array<{ value: string | number; label?: string }>;
  disabled?: boolean;
  placeholder?: string;
  getInputProps: (property: keyof T, type?: 'input' | 'select') => Record<string, any>;
} & Pick<FormResult<T>, 'getErrorValence' | 'getErrorMessage'>;

export const FormInput = <T extends object>({
  property,
  type,
  label,
  options,
  disabled,
  placeholder,
  getInputProps,
  getErrorValence,
  getErrorMessage,
}: FormInputProps<T>) => {
  const validationValence = getErrorValence(property);
  const errorMessage = getErrorMessage(property);

  if (options) {
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Select.Root {...getInputProps(property, 'select')}>
            {/* TODO(burdon): Placeholder not working? */}
            <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {options.map(({ value, label }) => (
                    <Select.Option key={String(value)} value={String(value)}>
                      {label ?? String(value)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }

  if (type === 'boolean') {
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.Switch {...getInputProps(property)} />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }

  // TODO(burdon): Restrict string pattern (i.e., input masking based on schema).
  return (
    <Input.Root validationValence={validationValence}>
      <Input.Label>{label}</Input.Label>
      <Input.DescriptionAndValidation>
        <Input.TextInput type={type} disabled={disabled} placeholder={placeholder} {...getInputProps(property)} />
        <Input.Validation>{errorMessage}</Input.Validation>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};
