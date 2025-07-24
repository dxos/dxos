//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiServicePreset } from '@dxos/ai/testing';
import { Select } from '@dxos/react-ui';

export type ChatPresetsProps = {
  presets?: { id: AiServicePreset; label: string }[];
  preset?: AiServicePreset;
  onChange?: (preset: AiServicePreset) => void;
};

export const ChatPresets = ({ presets, preset, onChange }: ChatPresetsProps) => {
  return (
    <Select.Root value={preset} onValueChange={onChange}>
      <Select.TriggerButton classNames='mie-2 text-sm' />
      <Select.Content>
        {presets?.map(({ id, label }) => (
          <Select.Option key={id} value={id} classNames='text-sm'>
            {label}
          </Select.Option>
        ))}
      </Select.Content>
    </Select.Root>
  );
};
