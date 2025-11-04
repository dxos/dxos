//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

export type ChatPresetsProps = {
  presets?: { id: string; label: string }[];
  preset?: string;
  onChange?: (id: string) => void;
};

export const ChatPresets = ({ presets, preset, onChange }: ChatPresetsProps) => (
  <Select.Root value={preset} onValueChange={onChange}>
    <Select.TriggerButton classNames='text-sm' />
    <Select.Content>
      {presets?.map(({ id, label }) => (
        <Select.Option key={id} value={id} classNames='text-sm'>
          {label}
        </Select.Option>
      ))}
      <Select.Arrow />
    </Select.Content>
  </Select.Root>
);
