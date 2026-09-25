//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../testing/index.ts';
import { Accordion } from './Accordion.tsx';

random.seed(1);

type TestItem = { id: string; name: string; text: string };

const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: i.toString(),
  name: `Item ${i}`,
  text: random.lorem.paragraphs(3),
}));

const DefaultStory = () => {
  return (
    <Accordion.Root<TestItem> items={items}>
      {({ items }) => (
        <>
          {items.map((item) => (
            <Accordion.Item key={item.id} item={item}>
              <Accordion.ItemHeader icon='ph--circle--regular' hover>
                {item.name}
              </Accordion.ItemHeader>
              <Accordion.ItemBody>
                <p>{item.text}</p>
              </Accordion.ItemBody>
            </Accordion.Item>
          ))}
        </>
      )}
    </Accordion.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Accordion',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2' })],
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
