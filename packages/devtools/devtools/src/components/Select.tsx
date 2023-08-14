//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Select as AuroraSelect, SelectRootProps } from '@dxos/aurora';

export type SelectProps = SelectRootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => {
  return (
    <AuroraSelect.Root {...props}>
      <AuroraSelect.TriggerButton placeholder={'Select value'} />
      <AuroraSelect.Portal>
        <AuroraSelect.Content>
          <AuroraSelect.Viewport>
            {items?.map(({ value, label }) => (
              <AuroraSelect.Option key={value} value={value}>
                {label}
              </AuroraSelect.Option>
            ))}
          </AuroraSelect.Viewport>
        </AuroraSelect.Content>
      </AuroraSelect.Portal>
    </AuroraSelect.Root>
  );
};
