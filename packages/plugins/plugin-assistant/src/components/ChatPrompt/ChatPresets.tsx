//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Select from '@dxos/react-ui/Select';

import { AssistantPreset } from '#types';

export const ChatPresets = ({ presets, preset, onPresetChange }: AssistantPreset.ChatPresetProps) => {
  return (
    <Select.Root
      value={preset ? [preset] : []}
      onValueChange={({ value: [value] }) => value && onPresetChange?.(value)}
      items={(presets ?? []).map(({ id, label }) => ({ value: id, label: label }))}
    >
      <Select.Trigger classNames='text-sm' />
      <Select.Content>
        {presets?.map(({ id, label }) => (
          <Select.Item key={id} classNames='text-sm' item={{ value: id, label: label }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
