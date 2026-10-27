//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { IntrinsicCardContainer } from '@dxos/react-ui-mosaic/testing';
import * as Card from '@dxos/react-ui/Card';
import * as DragHandle from '@dxos/react-ui/DragHandle';
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
      <Card.Root>
        <Card.Header>
          <DragHandle.DragHandle />
          <Card.Title>{Obj.getLabel(subject)}</Card.Title>
        </Card.Header>
        <MessageCard role='card--content' subject={subject} />
      </Card.Root>
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
