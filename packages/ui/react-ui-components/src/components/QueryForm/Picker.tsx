//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Select, useTranslation } from '@dxos/react-ui';

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
    <Select.Root
      items={[{ value: NULL, label: t('picker-none.label') }, ...sorted]}
      value={[value ?? NULL]}
      onValueChange={({ value: [value] }) => onChange?.(value === NULL ? null : value)}
    >
      <Select.Trigger placeholder={placeholder ?? t('picker-select.label')} />
      <Select.Content>
        <Select.ItemGroup>
          <Select.Item item={{ value: NULL, label: t('picker-none.label') }} />
          {sorted.map(({ value, label }) => (
            <Select.Item key={value} item={{ value: value, label: label }} />
          ))}
        </Select.ItemGroup>
      </Select.Content>
    </Select.Root>
  );
};
