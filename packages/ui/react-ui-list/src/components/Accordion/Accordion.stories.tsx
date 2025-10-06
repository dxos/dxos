//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { Accordion } from './Accordion';

faker.seed(1);

type TestItem = { id: string; name: string; text: string };

const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: i.toString(),
  name: `Item ${i}`,
  text: faker.lorem.paragraphs(3),
}));

const DefaultStory = () => {
  return (
    <Accordion.Root<TestItem> items={items} classNames='w-[40rem]'>
      {({ items }) => (
        <div className='flex flex-col w-full border-y border-separator divide-y divide-separator'>
          {items.map((item) => (
            <Accordion.Item key={item.id} item={item} classNames='border-x border-separator'>
              <Accordion.ItemHeader>{item.name}</Accordion.ItemHeader>
              <Accordion.ItemBody>
                <p>{item.text}</p>
              </Accordion.ItemBody>
            </Accordion.Item>
          ))}
        </div>
      )}
    </Accordion.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/Accordion',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};
