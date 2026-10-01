//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

export type ControlledSelectorProps<T> = {
  values: T[];
  value: T;
  setValue: (newValue: T) => void;
  placeholder?: string;
};

export const ControlledSelector = <T extends string>(props: ControlledSelectorProps<T>) => {
  return (
    <Next.Select.Root value={props.value} onValueChange={props.setValue}>
      <Next.Select.Trigger placeholder={props.placeholder ?? 'Select space'} />
      <Next.Select.Content>
        {props.values.map((mode) => (
          <Next.Select.Item key={mode} value={mode}>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-neutral-250'>{mode}</span>
            </div>
          </Next.Select.Item>
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
