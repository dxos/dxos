//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as UiSelect from '@dxos/react-ui/Select';

export type SelectProps = {
  items?: UiSelect.Option[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** A single-value Select over `items`. */
export const Select = ({ items = [], value, onValueChange, disabled, placeholder = 'Select value' }: SelectProps) => (
  <UiSelect.Root
    items={items}
    value={value === undefined ? [] : [value]}
    onValueChange={({ value: [next] }) => next !== undefined && onValueChange?.(next)}
    disabled={disabled}
  >
    <UiSelect.Trigger placeholder={placeholder} />
    <UiSelect.Content>
      {items.map((item) => (
        <UiSelect.Item key={item.value} item={item} classNames='font-mono' />
      ))}
    </UiSelect.Content>
  </UiSelect.Root>
);
