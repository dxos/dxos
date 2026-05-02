//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

import { type SettingsFieldProps } from './SettingsFieldSet';

export type SelectFieldOption = {
  value: string;
  label?: string;
};

export type CreateSelectFieldOptions = {
  /** Options to display. Strings are used as both value and label. */
  options: ReadonlyArray<string | SelectFieldOption>;
  /** Label for the sentinel option that maps to `undefined`. Defaults to `'Default'`. Pass `null` to omit. */
  defaultLabel?: string | null;
};

const DEFAULT_VALUE = '__default';

/**
 * Factory for a `SettingsFieldSet` `fieldMap` entry that renders a Select control
 * over a fixed list of options, with an optional sentinel for `undefined`.
 */
export const createSelectField = ({
  options,
  defaultLabel = 'Default',
}: CreateSelectFieldOptions): React.FC<SettingsFieldProps<string | undefined>> => {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));

  return ({ value, onChange, readonly }) => (
    <Select.Root
      disabled={readonly}
      value={value ?? DEFAULT_VALUE}
      onValueChange={(next) => onChange(next === DEFAULT_VALUE ? undefined : next)}
    >
      <Select.TriggerButton disabled={readonly} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {defaultLabel !== null && <Select.Option value={DEFAULT_VALUE}>{defaultLabel}</Select.Option>}
            {normalized.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label ?? option.value}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
