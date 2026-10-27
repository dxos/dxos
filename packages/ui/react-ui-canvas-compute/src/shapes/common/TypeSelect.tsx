//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { ComputeValueType } from '@dxos/conductor';
import * as Select from '@dxos/react-ui/Select';

// TODO(burdon): Factor out.
export type TypeSelectProps = {
  value?: ComputeValueType;
  onValueChange: (value: ComputeValueType) => void;
};

export const TypeSelect = ({ value, onValueChange }: TypeSelectProps) => {
  return (
    <Select.Root
      value={value === undefined ? [] : [value]}
      onValueChange={({ value: [next] }) => {
        const type = ComputeValueType.literals.find((literal) => literal === next);
        if (type) {
          onValueChange(type);
        }
      }}
      items={ComputeValueType.literals.map((type) => ({ value: type, label: type }))}
    >
      <Select.Trigger classNames='w-full px-0!' />
      <Select.Content>
        {ComputeValueType.literals.map((type) => (
          <Select.Item key={type} item={{ value: type, label: type }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
