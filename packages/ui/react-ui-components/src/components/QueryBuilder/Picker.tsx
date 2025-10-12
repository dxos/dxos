//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations';

const NULL = '__null';

export type PickerProps<T extends { id: string; label: string }> = {
  placeholder?: string;
  values?: T[];
  value?: string | null;
  onChange?: (value: string | null) => void;
};

export const Picker = <T extends { id: string; label: string }>({
  placeholder,
  values,
  value,
  onChange,
}: PickerProps<T>) => {
  const { t } = useTranslation(translationKey);

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
              {values?.map(({ id, label }) => (
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
