//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';

import { AssistantPreset } from '#types';

export const ChatPresets = ({ presets, preset, onPresetChange }: AssistantPreset.ChatPresetProps) => {
  return (
    <Next.Select.Root
      value={preset ? [preset] : []}
      onValueChange={({ value: [value] }) => value && onPresetChange?.(value)}
      items={(presets ?? []).map(({ id, label }) => ({ value: id, label: label }))}
    >
      <Next.Select.Trigger classNames='text-sm' />
      <Next.Select.Content>
        {presets?.map(({ id, label }) => (
          <Next.Select.Item key={id} classNames='text-sm' item={{ value: id, label: label }} />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
