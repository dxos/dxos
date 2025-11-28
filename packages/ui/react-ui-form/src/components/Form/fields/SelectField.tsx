//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, Select } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export type SelectFieldOptions = FormFieldComponentProps & {
  options?: Array<{ value: string | number; label?: string }>;
};

export const SelectField = ({
  type,
  label,
  inline,
  readonly,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectFieldOptions) => {
  const { status, error } = getStatus();

  const value = getValue() as string | undefined;
  const handleValueChange = useCallback((value: string | number) => onValueChange(type, value), [type, onValueChange]);

  return readonly && !value ? null : (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
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
      {inline && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
