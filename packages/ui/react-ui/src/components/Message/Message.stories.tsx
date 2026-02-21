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
    <Callout.Root valence={valence}>
      {title && <Callout.Title>{title}</Callout.Title>}
      {body && <Callout.Content>{body}</Callout.Content>}
    </Callout.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/Message',
  component: Callout.Root as any,
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
