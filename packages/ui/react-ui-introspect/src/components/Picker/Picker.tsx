//
// Copyright 2026 DXOS.org
//

// Combobox-backed string picker. Used by `ToolForm` for fields whose
// schema is annotated with a `PickerKind` (plugin-id, package-name) so
// the user can pick from a known enumeration but still type a value
// that isn't in the list.

import React, { useMemo } from 'react';

import * as Combobox from '@dxos/react-ui/Combobox';

export type PickerProps = {
  options: ReadonlyArray<string>;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
};

export const Picker = ({ options, value, onValueChange, placeholder }: PickerProps) => {
  const items = useMemo(() => options.map((option) => ({ value: option, label: option })), [options]);
  return (
    <Combobox.Root
      items={items}
      value={value ? [value] : []}
      onValueChange={({ value: [next] }) => next !== undefined && onValueChange(next)}
    >
      <Combobox.Trigger placeholder={placeholder} />
      <Combobox.Content>
        <Combobox.Input placeholder={placeholder ?? 'Search…'} />
        <Combobox.List />
      </Combobox.Content>
    </Combobox.Root>
  );
};
