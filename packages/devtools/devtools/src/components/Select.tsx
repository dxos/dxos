//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

export type SelectProps = {
  items?: Next.SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** A single-value Select over `items`. */
export const Select = ({ items = [], value, onValueChange, disabled, placeholder = 'Select value' }: SelectProps) => (
  <Next.Select.Root
    items={items}
    value={value === undefined ? [] : [value]}
    onValueChange={({ value: [next] }) => next !== undefined && onValueChange?.(next)}
    disabled={disabled}
  >
    <Next.Select.Trigger placeholder={placeholder} />
    <Next.Select.Content>
      {items.map((item) => (
        <Next.Select.Item key={item.value} item={item} classNames='font-mono' />
      ))}
    </Next.Select.Content>
  </Next.Select.Root>
);
