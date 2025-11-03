//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { ComputeValueType } from '@dxos/conductor';
import { Select, type SelectRootProps } from '@dxos/react-ui';

// TODO(burdon): Factor out.
export const TypeSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.TriggerButton variant='ghost' classNames='w-full !px-0' />
    <Select.Portal>
      <Select.Content>
        <Select.ScrollUpButton />
        <Select.Viewport>
          {ComputeValueType.literals.map((type) => (
            <Select.Option key={type} value={type}>
              {type}
            </Select.Option>
          ))}
        </Select.Viewport>
        <Select.ScrollDownButton />
        <Select.Arrow />
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
