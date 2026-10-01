//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Select } from '@dxos/react-ui';

export type ControlledSelectorProps<T> = {
  values: T[];
  value: T;
  setValue: (newValue: T) => void;
  placeholder?: string;
};

export const ControlledSelector = <T extends string>(props: ControlledSelectorProps<T>) => {
  return (
    <Select.Root value={props.value} onValueChange={props.setValue}>
      <Select.Trigger placeholder={props.placeholder ?? 'Select space'} />
      <Select.Content>
        {props.values.map((mode) => (
          <Select.Item key={mode} value={mode}>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-neutral-250'>{mode}</span>
            </div>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};
