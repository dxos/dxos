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

/**
 * Factory for a `SettingsFieldSet` `fieldMap` entry that renders a Select control
 * over a fixed list of options, with an optional sentinel for `undefined`.
 */
export const createSelectField = ({
  options,
  defaultLabel = 'Default',
}: CreateSelectFieldOptions): React.FC<SettingsFieldProps<string | undefined>> => {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  const hasDefault = defaultLabel !== null;
  // Per-instance sentinel avoids collisions with real option values; empty string when the
  // sentinel is omitted so `undefined` maps to a value Select.Root treats as "no selection".
  const sentinel = hasDefault ? `__default__${Math.random().toString(36).slice(2)}` : '';

  return ({ value, onChange, readonly }) => (
    <Select.Root
      disabled={readonly}
      value={value ?? sentinel}
      onValueChange={(next) => onChange(hasDefault && next === sentinel ? undefined : next)}
    >
      <Select.TriggerButton disabled={readonly} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {hasDefault && <Select.Option value={sentinel}>{defaultLabel}</Select.Option>}
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
