//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

import { type ChatPresetProps } from '#types';

export const ChatPresets = ({ presets, preset, onPresetChange }: ChatPresetProps) => {
  return (
    <Select.Root value={preset} onValueChange={onPresetChange}>
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
};
