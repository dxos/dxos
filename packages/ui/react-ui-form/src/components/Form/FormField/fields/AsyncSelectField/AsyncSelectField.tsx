//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';

import { type FormFieldRendererProps } from '#types';

import { type OptionsLookup, type OptionsLookupEntry } from '../../../../../annotations';
import { pickValues, useAsyncFieldEffect, useFormValues } from '../../../../../hooks';
import { SelectField } from '../SelectField';

export type AsyncSelectFieldProps = FormFieldRendererProps<string> & {
  /** Loads the selectable options from the lookup's declared dependency fields. */
  lookup: OptionsLookup;
};

/**
 * A select whose options are loaded dynamically (debounced) from the fields the lookup declares in its
 * `deps`, via an {@link Annotation.OptionsLookup}. Re-runs only when one of those values changes.
 * Auto-selects the sole option when exactly one resolves and nothing is chosen yet.
 */
export const AsyncSelectField = ({ lookup, ...fieldProps }: AsyncSelectFieldProps) => {
  const values = useFormValues<AnyProperties>(AsyncSelectField.displayName);
  const subset = useMemo(() => pickValues(values, lookup.deps), [values, lookup.deps]);
  const key = useMemo(() => JSON.stringify(subset), [subset]);
  const { loading, data } = useAsyncFieldEffect<readonly OptionsLookupEntry[]>(() => lookup.load(subset), key);
  const options = data ?? [];

  const { type, placeholder } = fieldProps;
  const current = fieldProps.getValue();
  // `onValueChange` changes identity on every edit; hold it in a ref so auto-select depends only on the
  // resolved `data` and current value (avoids an effect-refire loop).
  const onValueChangeRef = useRef(fieldProps.onValueChange);
  onValueChangeRef.current = fieldProps.onValueChange;
  useEffect(() => {
    if ((current == null || current === '') && data?.length === 1) {
      onValueChangeRef.current(type, data[0].value);
    }
  }, [current, data, type]);

  const resolvedPlaceholder = loading ? 'Loading…' : options.length === 0 ? 'No options available' : placeholder;

  return (
    <SelectField
      {...fieldProps}
      placeholder={resolvedPlaceholder}
      options={options.map(({ value, label, secondaryLabel, icon }) => ({ value, label, secondaryLabel, icon }))}
    />
  );
};

AsyncSelectField.displayName = 'Form.AsyncSelectField';
