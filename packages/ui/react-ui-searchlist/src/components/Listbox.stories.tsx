//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useState } from 'react';

import { Listbox } from './Listbox';

const DefaultStory = () => {
  const [selectedValue, setSelectedValue] = useState<string>('option-2');

  const options = [
    { value: 'option-1', label: 'First Option' },
    { value: 'option-2', label: 'Second Option' },
    { value: 'option-3', label: 'Third Option' },
  ];

  return (
    <div className='w-64'>
      <Listbox.Root value={selectedValue} onValueChange={setSelectedValue}>
        {options.map((option) => (
          <Listbox.Option key={option.value} value={option.value}>
            <Listbox.OptionLabel>{option.label}</Listbox.OptionLabel>
            <Listbox.OptionIndicator />
          </Listbox.Option>
        ))}
      </Listbox.Root>
    </div>
  );
};

const DefaultValueStory = () => {
  const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ];

  return (
    <div className='w-64'>
      <Listbox.Root defaultValue='banana'>
        {options.map((option) => (
          <Listbox.Option key={option.value} value={option.value}>
            <Listbox.OptionLabel>{option.label}</Listbox.OptionLabel>
            <Listbox.OptionIndicator />
          </Listbox.Option>
        ))}
      </Listbox.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/Listbox',
  component: Listbox.Root,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Listbox.Root>;

export default meta;

export const Default: StoryObj<typeof DefaultStory> = {
  render: DefaultStory,
};

export const DefaultValue: StoryObj<typeof DefaultValueStory> = {
  render: DefaultValueStory,
};
