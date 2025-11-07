//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations';

import { InputHeader, type InputProps } from './Input';

export const TextInput = ({
  type,
  label,
  inputOnly,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();

  return readonly && !getValue() ? null : readonly === 'static' && inputOnly ? (
    <p>{getValue() ?? ''}</p>
  ) : (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{getValue() ?? ''}</p>
      ) : (
        <Input.TextInput
          disabled={!!readonly}
          placeholder={placeholder}
          value={getValue() ?? ''}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
      {inputOnly && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};

export const NumberInput = ({
  type,
  label,
  inputOnly,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();

  return readonly && !getValue() ? null : readonly === 'static' && inputOnly ? (
    <p>{getValue() ?? ''}</p>
  ) : (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{getValue() ?? ''}</p>
      ) : (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={getValue()}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

export const BooleanInput = ({ type, label, inputOnly, getStatus, getValue, onValueChange, readonly }: InputProps) => {
  const { status, error } = getStatus();
  const checked = Boolean(getValue());
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{t(checked ? 'boolean input true value' : 'boolean input false value')}</p>
      ) : (
        <Input.Switch disabled={!!readonly} checked={checked} onCheckedChange={(value) => onValueChange(type, value)} />
      )}
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
  readonly,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectInputOptions) => {
  const { status, error } = getStatus();

  const value = getValue() as string | undefined;
  const handleValueChange = useCallback((value: string | number) => onValueChange(type, value), [type, onValueChange]);

  return readonly && !value ? null : (
    <Input.Root validationValence={status}>
      {!inputOnly && <InputHeader error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{options?.find(({ value: optionValue }) => optionValue === value)?.label ?? String(value)}</p>
      ) : (
        <Select.Root value={value} onValueChange={handleValueChange}>
          {/* TODO(burdon): Placeholder not working? */}
          <Select.TriggerButton classNames='is-full' disabled={!!readonly} placeholder={placeholder} />
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
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

export const MarkdownInput = ({
  type,
  label,
  inputOnly,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const { status, error } = getStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TODO(ZaymonFC): If we start using `Enter` for form submission, we should prevent default behavior here
  //  since we're using a textarea element and the user needs to be able to enter new lines.

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.blockSize = 'auto'; // For measurement.
      textarea.style.blockSize = `${textarea.scrollHeight + 2}px`;
    }
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
      {!inputOnly && <InputHeader error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{getValue() ?? ''}</p>
      ) : (
        <Input.TextArea
          ref={textareaRef}
          disabled={!!readonly}
          placeholder={placeholder}
          value={getValue() ?? ''}
          classNames={'min-bs-auto max-bs-40 overflow-auto'}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
          style={{ resize: 'none' }}
          spellCheck={false}
        />
      )}
      {inputOnly && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};
