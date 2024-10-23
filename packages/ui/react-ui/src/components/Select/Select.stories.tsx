//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';

import { Select } from './Select';
import { withVariants, withTheme } from '../../testing';

faker.seed(1234);

type ItemProps = { id: string; text: string };

type StoryProps = { items: ItemProps[] };

const Story = ({ items = [] }: StoryProps) => {
  const [value, setValue] = useState<string>();
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.TriggerButton placeholder='Select value' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {items.map(({ id, text }) => (
              <Select.Option key={id} value={id}>
                {text}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default {
  title: 'react-ui/Select',
  render: Story,
  decorators: [withVariants(), withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default: StoryObj<StoryProps> = {
  args: {
    items: Array.from({ length: 16 }).map((_, i) => ({ id: `item-${i}`, text: faker.lorem.word() })),
  },
};
