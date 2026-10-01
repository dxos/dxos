//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';

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
    <Next.Select.Root
      items={items}
      value={[value]}
      onValueChange={({ value: [next] }) => {
        const mode = values.find((candidate) => candidate === next);
        if (mode !== undefined) {
          setValue(mode);
        }
      }}
    >
      <Next.Select.Trigger placeholder={placeholder ?? 'Select space'} />
      <Next.Select.Content>
        {items.map((item) => (
          <Next.Select.Item key={item.value} item={item} classNames='font-mono' />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
