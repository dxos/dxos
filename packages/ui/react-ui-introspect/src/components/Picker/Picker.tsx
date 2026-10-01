//
// Copyright 2026 DXOS.org
//

// Combobox-backed string picker. Used by `ToolForm` for fields whose
// schema is annotated with a `PickerKind` (plugin-id, package-name) so
// the user can pick from a known enumeration but still type a value
// that isn't in the list.

import React, { useMemo, useState } from 'react';

import { Next } from '@dxos/react-ui/next';

export type PickerProps = {
  options: ReadonlyArray<string>;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
};

export const Picker = ({ options, value, onValueChange, placeholder }: PickerProps) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query) {
      return options;
    }
    const needle = query.toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  return (
    <Next.Combobox.Root value={value} onValueChange={onValueChange} placeholder={placeholder}>
      <Next.Combobox.Trigger />
      <Next.Combobox.Content>
        <Next.Combobox.Input placeholder={placeholder ?? 'Search…'} value={query} onValueChange={setQuery} />
        <Next.Combobox.List>
          {filtered.map((option) => (
            <Next.Combobox.Item key={option} value={option} label={option} />
          ))}
        </Next.Combobox.List>
      </Next.Combobox.Content>
    </Next.Combobox.Root>
  );
};
