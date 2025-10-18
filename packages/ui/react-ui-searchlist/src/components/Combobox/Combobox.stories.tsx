//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { PopoverCombobox } from './PopoverCombobox';

faker.seed(1234);

const items = faker.helpers.uniqueArray(faker.commerce.productName, 16);

const DefaultStory = () => {
  return (
    <PopoverCombobox.Root
      placeholder='Nothing selected'
      onValueChange={(value) => {
        console.log('[Combobox.Root.onValueChange]', value);
      }}
    >
      <PopoverCombobox.Trigger />
      <PopoverCombobox.Content filter={(value, search) => (value.includes(search) ? 1 : 0)}>
        <PopoverCombobox.Input placeholder='Search...' />
        <PopoverCombobox.List>
          {items.map((value) => (
            <PopoverCombobox.Item key={value}>{value}</PopoverCombobox.Item>
          ))}
        </PopoverCombobox.List>
        <PopoverCombobox.Arrow />
      </PopoverCombobox.Content>
    </PopoverCombobox.Root>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/Combobox',
  component: PopoverCombobox.Root as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    translations,
    layout: {
      type: 'column',
      className: 'p-2',
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
