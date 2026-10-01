//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

type SelectRootProps = React.ComponentProps<typeof Next.Select.Root>;

export type SelectProps = SelectRootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => {
  return (
    <Next.Select.Root {...props}>
      <Next.Button asChild>
        <Next.Select.Trigger placeholder={'Select value'} />
      </Next.Button>
      <Next.Select.Content>
        {items?.map(({ value, label }) => (
          <Next.Select.Item key={value} value={value}>
            <span className='font-mono'>{label}</span>
          </Next.Select.Item>
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
