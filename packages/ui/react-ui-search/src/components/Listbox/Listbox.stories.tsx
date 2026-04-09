//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Listbox } from './Listbox';

random.seed(1234);

type StoryItem = { value: string; label: string };

const options: StoryItem[] = random.helpers.multiple(
  () => ({ value: random.string.uuid(), label: random.commerce.productName() }) satisfies StoryItem,
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
  title: 'ui/react-ui-search/Listbox',
  component: Listbox.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof Listbox.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
