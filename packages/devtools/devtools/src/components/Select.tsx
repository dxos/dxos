//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Select as AuroraSelect, type SelectRootProps, Toolbar } from '@dxos/aurora';

export type SelectProps = SelectRootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => {
  return (
    <AuroraSelect.Root {...props}>
      <Toolbar.Button asChild>
        <AuroraSelect.TriggerButton placeholder={'Select value'} />
      </Toolbar.Button>
      <AuroraSelect.Portal>
        <AuroraSelect.Content>
          <AuroraSelect.Viewport>
            {items?.map(({ value, label }) => (
              <AuroraSelect.Option key={value} value={value}>
                <span className='font-mono'>{label}</span>
              </AuroraSelect.Option>
            ))}
          </AuroraSelect.Viewport>
        </AuroraSelect.Content>
      </AuroraSelect.Portal>
    </AuroraSelect.Root>
  );
};
