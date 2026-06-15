//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const NumberField = ({
  type,
  readonly,
  placeholder,
  getValue,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<number>) => {
  // Track raw string input so the user can clear the field before typing a new number.
  // We only commit to onValueChange when the raw string parses to a valid number.
  const [raw, setRaw] = useState<string>(() => {
    const v = getValue();
    return v !== undefined ? String(v) : '';
  });

  // Sync display when an external change updates the committed value (e.g. reactive form
  // calculations). Only overwrite raw when the external value differs from what raw parses
  // to, preserving partial edits like "1." which correctly parse to 1.
  const externalValue = getValue();
  useEffect(() => {
    if (externalValue !== safeParseFloat(raw)) {
      setRaw(externalValue !== undefined ? String(externalValue) : '');
    }
  }, [externalValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback<NonNullable<TextInputProps['onChange']>>(
    (event) => {
      const value = event.target.value;
      setRaw(value);
      const parsed = safeParseFloat(value);
      if (parsed !== undefined) {
        onValueChange(type, parsed);
      }
    },
    [type, onValueChange],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      // If the field was left empty or invalid, reset to the last committed value.
      if (safeParseFloat(raw) === undefined) {
        const committed = getValue();
        setRaw(committed !== undefined ? String(committed) : '');
      }
      onBlur(event);
    },
    [raw, getValue, onBlur],
  );

  return (
    <FormFieldWrapper<number> readonly={readonly} getValue={getValue} {...props}>
      {() => (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
