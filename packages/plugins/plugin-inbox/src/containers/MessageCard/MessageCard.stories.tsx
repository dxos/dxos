//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { Next } from '@dxos/react-ui';
import { IntrinsicCardContainer } from '@dxos/react-ui-mosaic/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { MessageCard } from './MessageCard.tsx';

random.seed(1234);

const createMockMessage = (): Message.Message =>
  Obj.make(Message.Message, {
    blocks: [
      {
        _tag: 'text',
        text: random.lorem.paragraph(),
      },
    ],
    created: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1_000).toISOString(),
    sender: {
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
    properties: {
      subject: random.lorem.sentence(18),
    },
  });

const MessageCardStory = () => {
  const subject = useMemo(() => createMockMessage(), []);
  return (
    <IntrinsicCardContainer>
      <Next.Card.Root>
        <Next.Card.Header>
          <Next.DragHandle />
          <Next.Card.Title>{Obj.getLabel(subject)}</Next.Card.Title>
        </Next.Card.Header>
        <MessageCard role='card--content' subject={subject} />
      </Next.Card.Root>
    </IntrinsicCardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MessageCard',
  component: MessageCardStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof MessageCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
