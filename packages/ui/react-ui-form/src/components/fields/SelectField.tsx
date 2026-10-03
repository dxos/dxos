//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Typography from '@dxos/react-ui/Typography';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../presentation.tsx';

export type SelectFieldOption = { value: string | number; label?: string; icon?: string };

export type SelectFieldProps = FormFieldRendererProps & {
  options?: SelectFieldOption[];
};

/**
 * `Select` over literal options. Next options are strings (AUDIT 2.14), so the field keeps the map back to each
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
  const items = useMemo<Select.Option[]>(
    () => options.map(({ value, label, icon }) => ({ value: String(value), label: label ?? String(value), icon })),
    [options],
  );
  const { t } = Hooks.useTranslation(translationKey);
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return (
      <Typography.Typography truncate>
        {options.find((option) => option.value === value)?.label ?? String(value ?? '')}
      </Typography.Typography>
    );
  }

  return (
    <SelectControl
      items={items}
      value={value == null ? undefined : String(value)}
      placeholder={placeholder ?? t('select.placeholder')}
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
  items: Select.Option[];
  value?: string;
  placeholder?: string;
  readonly?: boolean;
  /** Options are still loading: the trigger shows a spinner and is `aria-busy`. */
  loading?: boolean;
  onValueChange: (value: string | undefined) => void;
};

/** The Select a field row holds: Ark reads the enclosing `Field.Root` for the label and state ids. */
export const SelectControl = ({ items, value, placeholder, readonly, loading, onValueChange }: SelectControlProps) => (
  <Select.Root
    items={items}
    value={value === undefined ? [] : [value]}
    disabled={!!readonly}
    onValueChange={({ value: [next] }) => onValueChange(next)}
  >
    <Select.Trigger placeholder={placeholder} loading={loading} />
    <Select.Content>
      {items.map((item) => (
        <Select.Item key={item.value} item={item} />
      ))}
    </Select.Content>
  </Select.Root>
);
