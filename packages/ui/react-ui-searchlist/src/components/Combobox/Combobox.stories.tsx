//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Combobox } from './Combobox';

faker.seed(1234);

const items = faker.helpers.uniqueArray(faker.commerce.productName, 16).sort();

const DefaultStory = () => {
  return (
    <Combobox.Root
      placeholder='Nothing selected'
      onValueChange={(value) => {
        console.log('[Combobox.Root.onValueChange]', value);
      }}
    >
      <Combobox.Trigger />
      <Combobox.Content filter={(value, search) => (value.includes(search) ? 1 : 0)}>
        <Combobox.Input placeholder='Search...' />
        <Combobox.List>
          {items.map((value) => (
            <Combobox.Item key={value}>{value}</Combobox.Item>
          ))}
        </Combobox.List>
        <Combobox.Arrow />
      </Combobox.Content>
    </Combobox.Root>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/Combobox',
  component: Combobox.Root as any,
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
