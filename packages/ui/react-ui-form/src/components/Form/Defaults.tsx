//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { Input, Select } from '@dxos/react-ui';

import { type InputProps, InputHeader } from './Input';

export const TextInput = ({
  type,
  label,
  inputOnly,
  disabled,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <Input.TextInput
        disabled={disabled}
        placeholder={placeholder}
        value={getValue() ?? ''}
        onChange={(event) => onValueChange(type, event.target.value)}
        onBlur={onBlur}
      />
      {inputOnly && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};

export const NumberInput = ({
  type,
  label,
  inputOnly,
  disabled,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <Input.TextInput
        type='number'
        disabled={disabled}
        placeholder={placeholder}
        value={getValue() ?? 0}
        onChange={(event) => onValueChange(type, event.target.value)}
        onBlur={onBlur}
      />
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

export const BooleanInput = ({ type, label, inputOnly, getStatus, getValue, onValueChange }: InputProps) => {
  const { status, error } = getStatus();
  const checked = Boolean(getValue());

  // TODO(burdon): Runtime error:
  //  Warning: Unknown event handler property `onCheckedChange`. It will be ignored.
  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <Input.Switch checked={checked} onCheckedChange={(value) => onValueChange(type, value)} />
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

export type SelectInputOptions = InputProps & {
  options?: Array<{ value: string | number; label?: string }>;
};

export const SelectInput = ({
  type,
  label,
  inputOnly,
  disabled,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectInputOptions) => {
  const { status, error } = getStatus();

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <Select.Root value={getValue()} onValueChange={(value) => onValueChange(type, value)}>
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
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

export const MarkdownInput = ({
  type,
  label,
  inputOnly,
  disabled,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.blockSize = 'auto'; // For measurement.
    textarea.style.blockSize = `${textarea.scrollHeight + 2}px`;
  }, []);

  // Adjust height on initial render.
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  // Adjust height when the content changes.
  useEffect(() => {
    adjustHeight();
  }, [getValue(), adjustHeight]);

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && (
        <InputHeader error={error}>
          <Input.Label>{label}</Input.Label>
        </InputHeader>
      )}
      <Input.TextArea
        ref={textareaRef}
        disabled={disabled}
        placeholder={placeholder}
        value={getValue() ?? ''}
        classNames={'min-bs-auto overflow-hidden'}
        onChange={(event) => onValueChange(type, event.target.value)}
        onBlur={onBlur}
        style={{ resize: 'none' }}
      />
      {inputOnly && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};
