//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SelectRootProps, Toolbar, Select as UiSelect } from '@dxos/react-ui';

export type SelectProps = SelectRootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => (
  <UiSelect.Root {...props}>
    <Toolbar.Button asChild>
      <UiSelect.TriggerButton placeholder={'Select value'} />
    </Toolbar.Button>
    <UiSelect.Portal>
      <UiSelect.Content>
        <UiSelect.Viewport>
          {items?.map(({ value, label }) => (
            <UiSelect.Option key={value} value={value}>
              <span className='font-mono'>{label}</span>
            </UiSelect.Option>
          ))}
        </UiSelect.Viewport>
      </UiSelect.Content>
    </UiSelect.Portal>
  </UiSelect.Root>
);
