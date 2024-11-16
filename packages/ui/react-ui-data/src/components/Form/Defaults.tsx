//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select } from '@dxos/react-ui';

import { type InputProps } from '../../hooks';

export const TextField = <T extends object>({
  property,
  type,
  label,
  disabled,
  placeholder,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <Input.DescriptionAndValidation>
        <Input.TextInput
          disabled={disabled}
          placeholder={placeholder}
          value={getValue(property, type) ?? ''}
          onChange={(event) => onValueChange(property, type, event.target.value)}
          onBlur={onBlur}
        />
        <Input.Validation>{errorMessage}</Input.Validation>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};

export const NumberField = <T extends object>({
  property,
  type,
  label,
  disabled,
  placeholder,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <Input.DescriptionAndValidation>
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={placeholder}
          value={getValue(property, type) ?? 0}
          onChange={(event) => onValueChange(property, type, event.target.value)}
          onBlur={onBlur}
        />
        <Input.Validation>{errorMessage}</Input.Validation>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};

export const BooleanField = <T extends object>({
  property,
  type,
  label,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
}: InputProps<T>) => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <Input.DescriptionAndValidation>
        <Input.Switch
          checked={getValue<boolean>(property, type)}
          onCheckedChange={(value) => onValueChange(property, type, value)}
        />
        <Input.Validation>{errorMessage}</Input.Validation>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};

export const SelectField = <T extends object>({
  property,
  type,
  label,
  options,
  disabled,
  placeholder,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
}: InputProps<T>) => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <Input.DescriptionAndValidation>
        <Select.Root value={getValue(property, type)} onValueChange={(value) => onValueChange(property, type, value)}>
          {/* TODO(burdon): Placeholder not working? */}
          <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {options?.map(({ value, label }) => (
                  // Note: Numeric values are converted to and from strings.
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
};
