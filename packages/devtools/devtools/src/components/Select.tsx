//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as SelectModule from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export type SelectProps = SelectModule.RootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => {
  return (
    <SelectModule.Root {...props}>
      <Toolbar.Button asChild>
        <SelectModule.TriggerButton placeholder={'Select value'} />
      </Toolbar.Button>
      <SelectModule.Portal>
        <SelectModule.Content>
          <SelectModule.Viewport>
            {items?.map(({ value, label }) => (
              <SelectModule.Option key={value} value={value}>
                <span className='font-mono'>{label}</span>
              </SelectModule.Option>
            ))}
          </SelectModule.Viewport>
        </SelectModule.Content>
      </SelectModule.Portal>
    </SelectModule.Root>
  );
};
