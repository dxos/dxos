//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow.tsx';
import { getNumericConstraints } from './numeric-constraints.ts';

export const NumberField = ({
  type,
  readonly,
  placeholder,
  getValue,
  onValueChange,
  onBlur,
  ...props
}: FormFieldRendererProps<number>) => {
  const { min, max, integer } = getNumericConstraints(type);

  // Clamp to the declared bounds (and round when integer) so the committed value respects the schema's
  // natural limits — `<input type="number">`'s min/max only constrain the spinner, not typed input.
  const clamp = useCallback(
    (n: number) => {
      let value = integer ? Math.round(n) : n;
      if (min !== undefined) {
        value = Math.max(min, value);
      }
      if (max !== undefined) {
        value = Math.min(max, value);
      }
      return value;
    },
    [min, max, integer],
  );

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
        onValueChange(type, clamp(parsed));
      }
    },
    [type, onValueChange, clamp],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      const parsed = safeParseFloat(raw);
      if (parsed === undefined) {
        // The field was left empty or invalid; reset to the last committed value.
        const committed = getValue();
        setRaw(committed !== undefined ? String(committed) : '');
      } else {
        // Reflect the clamped value even when it equals the previously committed one (so `externalValue`
        // doesn't change), otherwise the input keeps showing the out-of-range text the user typed.
        setRaw(String(clamp(parsed)));
      }
      onBlur(event);
    },
    [raw, getValue, onBlur, clamp],
  );

  return (
    <FormRow<number> readonly={readonly} getValue={getValue} {...props}>
      {() => (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={raw}
          min={min}
          max={max}
          step={integer ? 1 : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      )}
    </FormRow>
  );
};
