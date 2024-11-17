//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Icon, Input, Select, Tooltip } from '@dxos/react-ui';
import { errorText } from '@dxos/react-ui-theme';

import { type InputProps } from '../../hooks';

export type InputHeaderProps = PropsWithChildren<{
  error?: string;
}>;

export const InputHeader = ({ children, error }: InputHeaderProps) => {
  return (
    <div role='none' className='flex justify-between items-center my-1'>
      {children}
      {error && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Icon icon='ph--warning--regular' size={4} classNames={errorText} />
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom'>
            <Tooltip.Arrow />
            {error}
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};

export const TextInput = <T extends object>({
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

export const NumberInput = <T extends object>({
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

export const BooleanInput = <T extends object>({
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

export const SelectInput = <T extends object>({
  property,
  type,
  label,
  disabled,
  placeholder,
  options,
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
