//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';
import { Card } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';
import { IntrinsicCardContainer } from '@dxos/storybook-utils';

import { MessageCard } from './MessageCard';

faker.seed(1234);

const createMockMessage = (): DataType.Message =>
  Obj.make(DataType.Message, {
    blocks: [
      {
        _tag: 'text',
        text: faker.lorem.paragraph(),
      },
    ],
    created: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1_000).toISOString(),
    sender: {
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
    properties: {
      subject: faker.lorem.sentence(18),
    },
  });

const meta = {
  title: 'plugins/plugin-inbox/MessageCard',
  component: MessageCard,
  render: (args) => {
    return (
      <IntrinsicCardContainer>
        <Card.StaticRoot>
          <MessageCard {...args} />
        </Card.StaticRoot>
      </IntrinsicCardContainer>
    );
  },
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MessageCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: createMockMessage(),
    role: 'card--intrinsic',
  },
};
