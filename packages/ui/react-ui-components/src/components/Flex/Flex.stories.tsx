//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Flex } from './Flex';

const DefaultStory = () => {
  const items = Array.from({ length: 100 }, () => faker.lorem.sentences(1));

  return (
    <Flex column grow>
      <Flex classNames='p-2'>{faker.lorem.sentence()}</Flex>
      <Flex column scroll>
        {items.map((item, i) => (
          <Flex key={i} classNames='p-2'>
            {item}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};

const meta = {
  title: 'ui/react-ui-components/Flex',
  component: Flex,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column' })],
} satisfies Meta<typeof Flex>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
