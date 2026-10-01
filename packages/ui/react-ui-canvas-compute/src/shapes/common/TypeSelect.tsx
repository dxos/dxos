//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { ComputeValueType } from '@dxos/conductor';
import { Next } from '@dxos/react-ui/next';

// TODO(burdon): Factor out.
export type TypeSelectProps = {
  value?: ComputeValueType;
  onValueChange: (value: ComputeValueType) => void;
};

export const TypeSelect = ({ value, onValueChange }: TypeSelectProps) => {
  return (
    <Next.Select.Root
      value={value === undefined ? [] : [value]}
      onValueChange={({ value: [next] }) => {
        const type = ComputeValueType.literals.find((literal) => literal === next);
        if (type) {
          onValueChange(type);
        }
      }}
      items={ComputeValueType.literals.map((type) => ({ value: type, label: type }))}
    >
      <Next.Select.Trigger classNames='w-full px-0!' />
      <Next.Select.Content>
        {ComputeValueType.literals.map((type) => (
          <Next.Select.Item key={type} item={{ value: type, label: type }} />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
