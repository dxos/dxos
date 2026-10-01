//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { ComputeValueType } from '@dxos/conductor';
import { Next } from '@dxos/react-ui/next';

// TODO(burdon): Factor out.
type SelectRootProps = React.ComponentProps<typeof Next.Select.Root>;

export const TypeSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => {
  return (
    <Next.Select.Root
      value={[value]}
      onValueChange={({ value: [value] }) => onValueChange(value)}
      items={ComputeValueType.literals.map((type) => ({ value: type, label: type }))}
    >
      <Next.Select.Trigger variant='ghost' classNames='w-full px-0!' />
      <Next.Select.Content>
        {ComputeValueType.literals.map((type) => (
          <Next.Select.Item key={type} item={{ value: type, label: type }} />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
