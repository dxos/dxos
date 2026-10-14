//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import * as Combobox from '@dxos/react-ui/Combobox';

import { type FormFieldRendererProps } from '#types';

import { type OptionsLookup, type OptionsLookupEntry } from '../../annotations.ts';
import { pickValues, useAsyncFieldEffect, useFormValues } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

export type ComboboxFieldProps = FormFieldRendererProps<string | undefined> & {
  /** Loads suggestions from the lookup's declared dependency fields (typically the field's own value). */
  lookup: OptionsLookup;
};

// The lookup's suggestions are already narrowed by the query, so the Combobox keeps every item it is given.
const keepAll = () => true;

/**
 * An editable `Combobox` (input mode) whose suggestions load (debounced) from an {@link OptionsLookup}; when the
 * field's own path is among the lookup's `deps`, the typed text drives the lookup. The typed text is offered last as a
 * free value unless a suggestion already is it; nothing is listed before typing unless the lookup is `eager`.
 */
export const ComboboxField = ({
  lookup,
  type,
  format,
  readonly,
  placeholder,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
  onBlur,
}: ComboboxFieldProps) => {
  const values = useFormValues<AnyProperties>('Form.ComboboxField');
  const [query, setQuery] = useState('');
  const lookupValues = useMemo(() => {
    const subset = pickValues(values, lookup.deps);
    if (jsonPath && lookup.deps.includes(jsonPath)) {
      subset[jsonPath] = query;
    }
    return subset;
  }, [values, lookup.deps, jsonPath, query]);
  const key = useMemo(() => JSON.stringify(lookupValues), [lookupValues]);
  const { data } = useAsyncFieldEffect<readonly OptionsLookupEntry[]>(() => lookup.load(lookupValues), key);

  const value = getValue() ?? '';
  const trimmed = query.trim();
  const items = useMemo<Combobox.Option[]>(() => {
    const loaded = (data ?? []).map((option) => ({ value: option.value, label: option.label ?? option.value }));
    const results =
      trimmed.length === 0
        ? lookup.eager
          ? loaded
          : []
        : loaded.filter((option) => option.label.toLowerCase().includes(trimmed.toLowerCase()));
    const free = trimmed.length > 0 && !results.some((option) => option.value === trimmed);
    // The current value stays an item, so the input can show its label before anything is typed.
    const current = value && !results.some((option) => option.value === value);
    return [
      ...(current ? [loaded.find((option) => option.value === value) ?? { value, label: value }] : []),
      ...results,
      ...(free ? [{ value: trimmed, label: trimmed }] : []),
    ];
  }, [data, trimmed, lookup.eager, value]);

  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={items.find((item) => item.value === value)?.label ?? value} format={format} />;
  }

  return (
    <Combobox.Root
      items={items}
      filter={keepAll}
      disabled={!!readonly}
      value={value ? [value] : []}
      onInputValueChange={({ inputValue, reason }) => reason === 'input-change' && setQuery(inputValue)}
      onOpenChange={({ open }) => !open && setQuery('')}
      onValueChange={({ value: [next] }) => {
        onValueChange(type, next);
        onBlur();
      }}
    >
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.Trigger />
      </Combobox.Control>
      <Combobox.Content />
    </Combobox.Root>
  );
};
