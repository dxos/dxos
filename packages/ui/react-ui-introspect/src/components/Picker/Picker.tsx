//
// Copyright 2026 DXOS.org
//

// Combobox-backed string picker. Used by `ToolForm` for fields whose
// schema is annotated with a `PickerKind` (plugin-id, package-name) so
// the user can pick from a known enumeration but still type a value
// that isn't in the list.

import React, { useMemo, useState } from 'react';

import { Combobox } from '@dxos/react-ui-list';

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
    <Combobox.Root value={value} onValueChange={onValueChange} placeholder={placeholder}>
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Input placeholder={placeholder ?? 'Search…'} value={query} onValueChange={setQuery} />
        <Combobox.List>
          {filtered.map((option) => (
            <Combobox.Item key={option} value={option} label={option} />
          ))}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
};
