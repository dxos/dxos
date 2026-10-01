//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Next } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../presentation.tsx';

export type SelectFieldOption = { value: string | number; label?: string; icon?: string };

export type SelectFieldProps = FormFieldRendererProps & {
  options?: SelectFieldOption[];
};

/**
 * `Next.Select` over literal options. Next options are strings (AUDIT 2.14), so the field keeps the map back to each
 * literal; the popup inherits the row's size (Phase 4 decision 2).
 */
export const SelectField = ({
  type,
  readonly,
  placeholder,
  options = [],
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: SelectFieldProps) => {
  const items = useMemo<Next.SelectOption[]>(
    () => options.map(({ value, label, icon }) => ({ value: String(value), label: label ?? String(value), icon })),
    [options],
  );
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return (
      <Next.Typography truncate>
        {options.find((option) => option.value === value)?.label ?? String(value ?? '')}
      </Next.Typography>
    );
  }

  return (
    <SelectControl
      items={items}
      value={value == null ? undefined : String(value)}
      placeholder={placeholder}
      readonly={readonly}
      onValueChange={(next) => {
        // A choice is a commit: the select never blurs, so it commits itself.
        onValueChange(type, options.find((option) => String(option.value) === next)?.value);
        onBlur();
      }}
    />
  );
};

type SelectControlProps = {
  items: Next.SelectOption[];
  value?: string;
  placeholder?: string;
  readonly?: boolean;
  /** Options are still loading: the trigger shows a spinner and is `aria-busy`. */
  loading?: boolean;
  onValueChange: (value: string | undefined) => void;
};

/** The Select a field row holds: Ark reads the enclosing `Field.Root` for the label and state ids. */
export const SelectControl = ({ items, value, placeholder, readonly, loading, onValueChange }: SelectControlProps) => (
  <Next.Select.Root
    items={items}
    value={value === undefined ? [] : [value]}
    disabled={!!readonly}
    onValueChange={({ value: [next] }) => onValueChange(next)}
  >
    <Next.Select.Trigger placeholder={placeholder} loading={loading} />
    <Next.Select.Content>
      {items.map((item) => (
        <Next.Select.Item key={item.value} item={item} />
      ))}
    </Next.Select.Content>
  </Next.Select.Root>
);
