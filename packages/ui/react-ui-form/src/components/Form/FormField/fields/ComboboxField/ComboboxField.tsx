//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { Combobox } from '@dxos/react-ui-list';

import { type FormFieldRendererProps } from '#types';

import { type OptionsLookup, type OptionsLookupEntry } from '../../../../../annotations';
import { pickValues, useAsyncFieldEffect, useFormValues } from '../../../../../hooks';
import { FormRow } from '../../FormRow';

export type ComboboxFieldProps = FormFieldRendererProps<string> & {
  /** Loads suggestions from the lookup's declared dependency fields (typically the field's own value). */
  lookup: OptionsLookup;
};

/**
 * An editable combobox built on the shared {@link Combobox} primitive (trigger + popover search list,
 * the same family as `ObjectPicker`/`SearchList`). The trigger shows the current value; opening it reveals
 * a search input that loads suggestions (debounced) via an {@link OptionsLookup} and filters
 * them as you type. The literal typed text is offered as a fallback option at the bottom (deduped), so a
 * value not among the suggestions can still be selected. No options are shown until something is typed.
 */
export const ComboboxField = ({ lookup, type, readonly, placeholder, onValueChange, ...props }: ComboboxFieldProps) => {
  const values = useFormValues<AnyProperties>(ComboboxField.displayName);
  const ownKey = props.jsonPath;
  const [query, setQuery] = useState('');

  // When the combobox searches on its own field (its name is among `deps`), feed the live query to the
  // loader so remote suggestions track typing; otherwise the loader reads the committed sibling values.
  const lookupValues = useMemo(() => {
    const subset = pickValues(values, lookup.deps);
    if (ownKey && lookup.deps.includes(ownKey)) {
      subset[ownKey] = query;
    }
    return subset;
  }, [values, lookup.deps, ownKey, query]);
  const key = useMemo(() => JSON.stringify(lookupValues), [lookupValues]);
  const { data } = useAsyncFieldEffect<readonly OptionsLookupEntry[]>(() => lookup.load(lookupValues), key);

  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  // No options until something is typed; then filter the loaded suggestions by the input text.
  const results = useMemo(
    () =>
      normalized.length === 0
        ? []
        : (data ?? []).filter((option) => (option.label ?? option.value).toLowerCase().includes(normalized)),
    [data, normalized],
  );
  const hasExact = results.some((option) => option.value === trimmed);

  const handleValueChange = useCallback((next: string) => onValueChange(type, next), [onValueChange, type]);
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setQuery('');
    }
  }, []);

  return (
    <FormRow<string>
      readonly={readonly}
      renderStatic={(value) => <p className='truncate min-w-0'>{value ?? ''}</p>}
      {...props}
    >
      {({ value = '' }) => (
        <Combobox.Root
          value={value}
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
          placeholder={placeholder}
        >
          {/* Full-width trigger (default renders value/placeholder + caret) to match the other fields. */}
          <Combobox.Trigger disabled={!!readonly} classNames='w-full' />
          <Combobox.Portal>
            {/* Keep the first result highlighted as the list changes while typing. */}
            <Combobox.Content resetSelectionOnChange>
              <Combobox.Input autoFocus value={query} onValueChange={setQuery} placeholder={placeholder} />
              <Combobox.List>
                {results.map((option) => (
                  <Combobox.Item
                    key={option.value}
                    value={option.value}
                    label={option.label ?? option.value}
                    suffix={option.secondaryLabel}
                  />
                ))}
                {/* The literal typed text as a fallback option at the bottom, unless a suggestion already is it. */}
                {normalized.length > 0 && !hasExact && <Combobox.Item value={trimmed} label={trimmed} />}
              </Combobox.List>
              <Combobox.Arrow />
            </Combobox.Content>
          </Combobox.Portal>
        </Combobox.Root>
      )}
    </FormRow>
  );
};

ComboboxField.displayName = 'Form.ComboboxField';
