//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';

const NULL = '__NULL__';

export type PickerProps<T extends { value: string; label: string }> = {
  placeholder?: string;
  values?: T[];
  value?: string | null;
  onChange?: (value: string | null) => void;
};

// TODO(wittjosiah): Should use `SelectInput` from `react-ui-form` instead.
export const Picker = <T extends { value: string; label: string }>({
  placeholder,
  values,
  value,
  onChange,
}: PickerProps<T>) => {
  const { t } = useTranslation(translationKey);
  const sorted = useMemo(() => values?.sort(({ label: a }, { label: b }) => a.localeCompare(b)) ?? [], [values]);

  return (
    <Next.Select.Root
      value={[value ?? NULL]}
      onValueChange={({ value: [value] }) => onChange?.(value === NULL ? null : value)}
    >
      <Next.Select.Trigger placeholder={placeholder ?? t('picker-select.label')} />
      <Next.Select.Content>
        <Next.Select.ItemGroup>
          <Next.Select.Item value={NULL}>
            <Next.Select.ItemText>{t('picker-none.label')}</Next.Select.ItemText>
          </Next.Select.Item>
          {sorted.map(({ value, label }) => (
            <Next.Select.Item key={value} value={value}>
              <Next.Select.ItemText>{label}</Next.Select.ItemText>
            </Next.Select.Item>
          ))}
        </Next.Select.ItemGroup>
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
