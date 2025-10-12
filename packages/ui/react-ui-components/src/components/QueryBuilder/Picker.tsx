//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Select, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations';

const NULL = '__NULL__';

export type PickerProps<T extends { id: string; label: string }> = {
  placeholder?: string;
  values?: T[];
  value?: string | null;
  onChange?: (value: string | null) => void;
};

// TODO(burdon): Factor out.
export const Picker = <T extends { id: string; label: string }>({
  placeholder,
  values,
  value,
  onChange,
}: PickerProps<T>) => {
  const { t } = useTranslation(translationKey);
  const sorted = useMemo(() => values?.sort(({ label: a }, { label: b }) => a.localeCompare(b)) ?? [], [values]);

  return (
    <Select.Root value={value ?? NULL} onValueChange={(value) => onChange?.(value === NULL ? null : value)}>
      <Select.TriggerButton placeholder={placeholder ?? t('picker select')} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            <Select.Group>
              <Select.Item value={NULL}>
                <Select.ItemText>{t('picker none')}</Select.ItemText>
              </Select.Item>
              {sorted.map(({ id, label }) => (
                <Select.Item key={id} value={id}>
                  <Select.ItemText>{label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
