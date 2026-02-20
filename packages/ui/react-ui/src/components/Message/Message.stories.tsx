//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { type MessageValence } from '@dxos/ui-types';

import { withTheme } from '../../testing';

import { Callout } from './Message';

faker.seed(123);

type StoryProps = {
  valence: MessageValence;
  title: string;
  body: string;
};

const DefaultStory = ({ valence, title, body }: StoryProps) => (
  <div className='is-[30rem]'>
    <Message.Root valence={valence}>
      {title && <Message.Title>{title}</Message.Title>}
      {body && <Message.Content>{body}</Message.Content>}
    </Message.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/Message',
  component: Message.Root as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    valence: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error', 'neutral'],
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    valence: 'neutral',
    title: 'Alert title',
    body: faker.lorem.paragraphs(1),
  },
};

export const Error: Story = {
  args: {
    valence: 'error',
    title: 'Error title',
    body: faker.lorem.paragraphs(1),
  },
};
