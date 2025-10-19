//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Listbox } from './Listbox';

faker.seed(1234);

type StoryItem = { value: string; label: string };

const options: StoryItem[] = faker.helpers.multiple(
  () => ({ value: faker.string.uuid(), label: faker.commerce.productName() }) satisfies StoryItem,
  { count: 16 },
);

const DefaultStory = () => {
  const [selectedValue, setSelectedValue] = useState<string>();

  return (
    <Listbox.Root value={selectedValue} onValueChange={setSelectedValue}>
      {options.map((option) => (
        <Listbox.Option key={option.value} value={option.value}>
          <Listbox.OptionLabel>{option.label}</Listbox.OptionLabel>
          <Listbox.OptionIndicator />
        </Listbox.Option>
      ))}
    </Listbox.Root>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/Listbox',
  component: Listbox.Root,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    translations,
    layout: {
      type: 'column',
      className: 'p-2',
    },
  },
} satisfies Meta<typeof Listbox.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
