//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type BaseObject } from '@dxos/echo-schema';
import { Input, Select } from '@dxos/react-ui';

import { type InputProps, InputHeader } from './Input';

export const TextInput = <T extends BaseObject>({
  property,
  type,
  label,
  disabled,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const { status, error } = getStatus?.(property);

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <Input.TextInput
        disabled={disabled}
        placeholder={placeholder}
        value={getValue(property) ?? ''}
        onChange={(event) => onValueChange(property, type, event.target.value)}
        onBlur={onBlur}
      />
    </Input.Root>
  );
};

export const NumberInput = <T extends BaseObject>({
  property,
  type,
  label,
  disabled,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const { status, error } = getStatus?.(property);

  // TODO(burdon): Only show stepper if bounded integer.
  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <Input.TextInput
        type='number'
        disabled={disabled}
        placeholder={placeholder}
        value={getValue(property) ?? 0}
        onChange={(event) => onValueChange(property, type, event.target.value)}
        onBlur={onBlur}
      />
    </Input.Root>
  );
};

export const BooleanInput = <T extends BaseObject>({
  property,
  type,
  label,
  getStatus,
  getValue,
  onValueChange,
}: InputProps<T>) => {
  const { status, error } = getStatus?.(property);

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <Input.Switch
        checked={getValue<boolean>(property)}
        onCheckedChange={(value) => onValueChange(property, type, value)}
      />
    </Input.Root>
  );
};

export type SelectInputOptions<T extends BaseObject> = InputProps<T> & {
  options?: Array<{ value: string | number; label?: string }>;
};

export const SelectInput = <T extends BaseObject>({
  property,
  type,
  label,
  disabled,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectInputOptions<T>) => {
  const { status, error } = getStatus?.(property);

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <Select.Root value={getValue(property)} onValueChange={(value) => onValueChange(property, type, value)}>
        {/* TODO(burdon): Placeholder not working? */}
        <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {options?.map(({ value, label }) => (
                // NOTE: Numeric values are converted to and from strings.
                <Select.Option key={String(value)} value={String(value)}>
                  {label ?? String(value)}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Input.Root>
  );
};
