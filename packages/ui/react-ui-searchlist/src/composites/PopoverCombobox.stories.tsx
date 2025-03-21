//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { PopoverCombobox } from './PopoverCombobox';

faker.seed(1234);

const storybookItems = faker.helpers.uniqueArray(faker.commerce.productName, 16);

const DefaultStory = () => {
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
  title: 'ui/react-ui-searchlist/PopoverCombobox',
  component: PopoverCombobox,
  render: DefaultStory,
  decorators: [withTheme],
};

export const Default = {
  args: {},
};
