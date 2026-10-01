//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { ComputeValueType } from '@dxos/conductor';
import { Select, type SelectRootProps } from '@dxos/react-ui';

// TODO(burdon): Factor out.
export const TypeSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger variant='ghost' classNames='w-full px-0!' />
      <Select.Content>
        {ComputeValueType.literals.map((type) => (
          <Select.Item key={type} item={{ value: type, label: type }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
