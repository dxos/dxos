//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { withSurfaceVariantsLayout } from '../../testing';

import { Select } from './Select';

faker.seed(1234);

type ItemProps = { id: string; text: string };

type StoryProps = { items: ItemProps[] };

const DefaultStory = ({ items = [] }: StoryProps) => {
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

const meta = {
  title: 'ui/react-ui-core/Select',
  render: DefaultStory,
  decorators: [withTheme, withSurfaceVariantsLayout()],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 16 }).map((_, i) => ({ id: `item-${i}`, text: faker.lorem.word() })),
  },
};
