//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

import { AssistantPreset } from '#types';

export const ChatPresets = ({ presets, preset, onPresetChange }: AssistantPreset.ChatPresetProps) => {
  return (
    <Select.Root value={preset} onValueChange={onPresetChange}>
      <Select.Trigger classNames='text-sm' />
      <Select.Content>
        {presets?.map(({ id, label }) => (
          <Select.Item key={id} classNames='text-sm' item={{ value: id, label: label }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
