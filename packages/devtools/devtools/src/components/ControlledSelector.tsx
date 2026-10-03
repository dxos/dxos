//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

export type ControlledSelectorProps<T> = {
  values: T[];
  value: T;
  setValue: (newValue: T) => void;
  placeholder?: string;
};

export const ControlledSelector = <T extends string>({
  values,
  value,
  setValue,
  placeholder,
}: ControlledSelectorProps<T>) => {
  const items = values.map((mode) => ({ value: mode, label: mode }));
  return (
    <Select.Root
      items={items}
      value={[value]}
      onValueChange={({ value: [next] }) => {
        const mode = values.find((candidate) => candidate === next);
        if (mode !== undefined) {
          setValue(mode);
        }
      }}
    >
      <Select.Trigger placeholder={placeholder ?? 'Select space'} />
      <Select.Content>
        {items.map((item) => (
          <Select.Item key={item.value} item={item} classNames='font-mono' />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
