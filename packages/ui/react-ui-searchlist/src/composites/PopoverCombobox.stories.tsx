//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { PopoverCombobox } from './PopoverCombobox';

faker.seed(1234);

const storybookItems = faker.helpers.uniqueArray(faker.commerce.product, 16);

const Story = () => {
  return (
    <PopoverCombobox.Root placeholder='Nothing selected'>
      <PopoverCombobox.Trigger />
      <PopoverCombobox.Content filter={(value, search) => (value.includes(search) ? 1 : 0)}>
        <PopoverCombobox.Input placeholder='Search...' />
        <PopoverCombobox.List>
          {storybookItems.map((value) => (
            <PopoverCombobox.Item key={value}>{value}</PopoverCombobox.Item>
          ))}
        </PopoverCombobox.List>
        <PopoverCombobox.Arrow />
      </PopoverCombobox.Content>
    </PopoverCombobox.Root>
  );
};

export default {
  title: 'react-ui-searchlist/PopoverCombobox',
  component: PopoverCombobox,
  decorators: [withTheme],
  render: Story,
};

export const Default = {
  args: {},
};
