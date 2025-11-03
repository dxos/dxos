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

export const ControlledSelector = <T extends string>(props: ControlledSelectorProps<T>) => (
  <Select.Root value={props.value} onValueChange={props.setValue}>
    <Select.TriggerButton placeholder={props.placeholder ?? 'Select space'} />
    <Select.Portal>
      <Select.Content>
        <Select.Viewport>
          {props.values.map((mode) => (
            <Select.Option key={mode} value={mode}>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-neutral-250'>{mode}</span>
              </div>
            </Select.Option>
          ))}
        </Select.Viewport>
        <Select.Arrow />
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
