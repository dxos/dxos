//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';
import { Card } from '@dxos/react-ui-mosaic';
import { IntrinsicCardContainer } from '@dxos/react-ui-mosaic/testing';
import { Message } from '@dxos/types';

import { MessageCard } from './MessageCard';

faker.seed(1234);

const createMockMessage = (): Message.Message =>
  Obj.make(Message.Message, {
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

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const MessageCardStory = ({ role }: Pick<SurfaceComponentProps<Message.Message>, 'role'>) => {
  const subject = useMemo(() => createMockMessage(), []);
  return (
    <IntrinsicCardContainer>
      <Card.Root>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{Obj.getLabel(subject)}</Card.Title>
        </Card.Toolbar>
        <MessageCard role={role} subject={subject} />
      </Card.Root>
    </IntrinsicCardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/MessageCard',
  component: MessageCardStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof MessageCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'card--intrinsic',
  },
};
