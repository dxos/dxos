//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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
    <Accordion.Root<TestItem> items={items}>
      {({ items }) => (
        <>
          {items.map((item) => (
            <Accordion.Item key={item.id}>
              <Accordion.ItemHeader title={item.name} />
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

const meta: Meta<typeof Accordion> = {
  title: 'ui/react-ui-list/Accordion',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};
