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
  ast,
  readonly,
  label,
  layout,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectFieldOptions) => {
  const { status, error } = getStatus();
  const value = getValue() as string | undefined;

  const handleValueChange = useCallback((value: string | number) => onValueChange(ast, value), [ast, onValueChange]);

  if ((readonly || layout === 'static') && value == null) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      {layout === 'static' ? (
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
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
