//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { Select } from '@dxos/react-ui';

// TODO(wittjosiah): Factor out? Consider reconciling with similar component in devtools.

export type SpaceSelectorProps = {
  spaces: Space[];
  value?: Space;
  placeholder?: string;
  getLabel?: (space: Space) => string;
  onChange?: (space: Space) => void;
};

export const SpaceSelector = ({ placeholder, spaces, value, getLabel, onChange }: SpaceSelectorProps) => {
  const handleValueChange = useCallback(
    (id: string) => {
      const space = spaces.find((space) => space.id === id);
      space && onChange?.(space);
    },
    [spaces, onChange],
  );

  return (
    <Select.Root value={value?.id} onValueChange={handleValueChange}>
      <Select.TriggerButton placeholder={placeholder} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {spaces.map((space) => (
              <Select.Option key={space.id} value={space.id}>
                <div className='flex items-center gap-2'>{getLabel?.(space) ?? space.id}</div>
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
