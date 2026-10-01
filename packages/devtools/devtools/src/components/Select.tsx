//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, type SelectRootProps, Select as UiSelect } from '@dxos/react-ui';

export type SelectProps = SelectRootProps & {
  items?: { value: string; label: string }[];
};

export const Select = ({ items = [], ...props }: SelectProps) => {
  return (
    <UiSelect.Root {...props}>
      <Button asChild>
        <UiSelect.Trigger placeholder={'Select value'} />
      </Button>
      <UiSelect.Content>
        {items?.map(({ value, label }) => (
          <UiSelect.Item key={value} value={value}>
            <span className='font-mono'>{label}</span>
          </UiSelect.Item>
        ))}
      </UiSelect.Content>
    </UiSelect.Root>
  );
};
