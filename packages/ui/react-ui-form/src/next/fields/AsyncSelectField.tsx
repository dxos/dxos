//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type Next } from '@dxos/react-ui/next';

import { type FormFieldRendererProps } from '#types';

import { type OptionsLookup, type OptionsLookupEntry } from '../../annotations.ts';
import { presentationFor } from '../../components/Form/FormField/presentation.tsx';
import { pickValues, useAsyncFieldEffect, useFormValues } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { SelectControl } from './SelectField.tsx';

export type AsyncSelectFieldProps = FormFieldRendererProps<string | undefined> & {
  /** Loads the options from the lookup's declared dependency fields. */
  lookup: OptionsLookup;
};

/**
 * A Select whose options load (debounced) from the fields the lookup declares in `deps`; the trigger shows a spinner
 * while they load, and the sole option is chosen when exactly one resolves and nothing is chosen yet.
 */
export const AsyncSelectField = ({
  lookup,
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: AsyncSelectFieldProps) => {
  const values = useFormValues<AnyProperties>('Form.AsyncSelectField');
  const subset = useMemo(() => pickValues(values, lookup.deps), [values, lookup.deps]);
  const key = useMemo(() => JSON.stringify(subset), [subset]);
  const { loading, data } = useAsyncFieldEffect<readonly OptionsLookupEntry[]>(() => lookup.load(subset), key);
  const items = useMemo<Next.SelectOption[]>(
    () => (data ?? []).map(({ value, label, icon }) => ({ value, label: label ?? value, icon })),
    [data],
  );

  // Held in refs so the auto-select depends only on the resolved options, not on accessors that change every edit.
  const current = getValue();
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const autoSelectedRef = useRef<typeof data>(undefined);
  useEffect(() => {
    if ((current == null || current === '') && data?.length === 1 && data !== autoSelectedRef.current) {
      autoSelectedRef.current = data;
      onValueChangeRef.current(type, data[0].value);
    }
  }, [current, data, type]);

  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={items.find((item) => item.value === current)?.label ?? current} format={format} />;
  }

  return (
    <SelectControl
      items={items}
      value={current || undefined}
      placeholder={placeholder}
      readonly={readonly}
      loading={loading}
      onValueChange={(next) => {
        onValueChange(type, next);
        onBlur();
      }}
    />
  );
};
