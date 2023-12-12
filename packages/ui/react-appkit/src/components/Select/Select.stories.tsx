//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Select } from './Select';

export default {
  component: Select,
  decorators: [withTheme],
  actions: { argTypesRegex: '^on.*' },
};

const Item = Select.Item;

export const Normal = (props: any) => {
  return (
    <Select defaultValue='orange' {...props}>
      <Item value='orange'>Orange</Item>
      <Item value='apple'>Apple</Item>
    </Select>
  );
};

export const DefaultValue = (props: any) => {
  return (
    <Select defaultValue='orange' {...props}>
      <Item value='orange'>Orange</Item>
      <Item value='banana'>Banana</Item>
      <Item value='apple'>Apple</Item>
      <Item value='pear'>Pear</Item>
      <Item value='grape'>Grape</Item>
      <Item value='plum'>Plum</Item>
    </Select>
  );
};

export const DisabledItems = (props: any) => {
  return (
    <Select defaultValue='apple' {...props}>
      <Item value='banana'>Banana</Item>
      <Item value='orange'>Orange</Item>
      <Item value='apple'>Apple</Item>
      <Item value='pear' disabled>
        Pear
      </Item>
    </Select>
  );
};
